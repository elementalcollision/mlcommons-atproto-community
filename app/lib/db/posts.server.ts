import { db } from '~/lib/db.server';
import { posts } from '../../../db/schema/posts';
import { votes } from '../../../db/schema/votes';
import { eq, and, or, sql, desc, asc, inArray, ilike } from 'drizzle-orm';
import type { Post, NewPost } from '../../../db/schema/posts';
import type { PostWithVotes } from '~/types/post';

/**
 * Find post by URI
 */
export async function findPostByUri(uri: string): Promise<Post | null> {
  const result = await db.query.posts.findFirst({
    where: eq(posts.uri, uri),
  });

  return result || null;
}

/**
 * Find post by rkey for a specific user
 */
export async function findPostByRkey(
  authorDid: string,
  rkey: string
): Promise<Post | null> {
  const result = await db.query.posts.findFirst({
    where: and(eq(posts.authorDid, authorDid), eq(posts.rkey, rkey)),
  });

  return result || null;
}

/**
 * Get post with vote information
 */
export async function getPostWithVotes(
  uri: string,
  userId?: string
): Promise<PostWithVotes | null> {
  const post = await findPostByUri(uri);
  if (!post) return null;

  // Get user's vote if userId provided
  let userVote: 'up' | 'down' | null = null;
  if (userId) {
    const vote = await db.query.votes.findFirst({
      where: and(eq(votes.authorDid, userId), eq(votes.subjectUri, uri)),
    });
    userVote = vote?.direction || null;
  }

  return {
    ...post,
    voteCount: post.voteCount || 0,
    userVote,
    isUpvoted: userVote === 'up',
    isDownvoted: userVote === 'down',
  };
}

/**
 * List posts with optional filtering and user vote status
 */
export async function listPosts(
  options: {
    communityId?: string;
    communityIds?: string[]; // For global/subscribed feeds
    authorDid?: string;
    replyRoot?: string;
    search?: string;
    tag?: string;
    includeRemoved?: boolean; // If true, include removed posts (for moderators)
    limit?: number;
    offset?: number;
    sortBy?: 'hot' | 'new' | 'top';
  } = {},
  userId?: string
): Promise<PostWithVotes[]> {
  const {
    communityId,
    communityIds,
    authorDid,
    replyRoot,
    search,
    tag,
    includeRemoved = false,
    limit = 20,
    offset = 0,
    sortBy = 'hot',
  } = options;

  // Build where conditions
  const conditions = [];
  if (communityId) {
    conditions.push(eq(posts.communityId, communityId));
  } else if (communityIds && communityIds.length > 0) {
    conditions.push(inArray(posts.communityId, communityIds));
  }
  if (authorDid) {
    conditions.push(eq(posts.authorDid, authorDid));
  }
  if (replyRoot !== undefined) {
    if (replyRoot === null || replyRoot === '') {
      // Get top-level posts only (not comments)
      conditions.push(sql`${posts.replyRoot} IS NULL`);
    } else {
      // Get comments for a specific post
      conditions.push(eq(posts.replyRoot, replyRoot));
    }
  }
  // Add search condition - search in title and text
  if (search && search.trim()) {
    const searchTerm = `%${search.trim()}%`;
    const searchCondition = or(
      ilike(posts.title, searchTerm),
      ilike(posts.text, searchTerm)
    );
    if (searchCondition) {
      conditions.push(searchCondition);
    }
  }

  // Add tag filter condition - filter by posts containing the tag
  if (tag && tag.trim()) {
    conditions.push(sql`${tag.trim()} = ANY(${posts.tags})`);
  }

  // Filter out removed posts unless explicitly included (for moderators)
  if (!includeRemoved) {
    conditions.push(eq(posts.isRemoved, false));
  }

  // Build base query
  const baseQuery = db
    .select()
    .from(posts)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .$dynamic();

  // Apply sorting - pinned posts always come first
  let sortedQuery;
  switch (sortBy) {
    case 'hot':
      sortedQuery = baseQuery.orderBy(desc(posts.isPinned), desc(posts.hotScore));
      break;
    case 'new':
      sortedQuery = baseQuery.orderBy(desc(posts.isPinned), desc(posts.createdAt));
      break;
    case 'top':
      sortedQuery = baseQuery.orderBy(desc(posts.isPinned), desc(posts.voteCount));
      break;
    default:
      sortedQuery = baseQuery.orderBy(desc(posts.isPinned), desc(posts.hotScore));
  }

  // Apply pagination
  const results = await sortedQuery.limit(limit).offset(offset);

  // If userId provided, get vote status for all posts
  if (userId && results.length > 0) {
    const postUris = results.map((p) => p.uri);
    const userVotes = await db
      .select()
      .from(votes)
      .where(and(eq(votes.authorDid, userId), inArray(votes.subjectUri, postUris)));

    const voteMap = new Map(
      userVotes.map((v) => [v.subjectUri, v.direction])
    );

    return results.map((post) => {
      const userVote = voteMap.get(post.uri) || null;
      return {
        ...post,
        voteCount: post.voteCount || 0,
        userVote,
        isUpvoted: userVote === 'up',
        isDownvoted: userVote === 'down',
      };
    });
  }

  return results.map((post) => ({
    ...post,
    voteCount: post.voteCount || 0,
    userVote: null,
    isUpvoted: false,
    isDownvoted: false,
  }));
}

/**
 * Insert new post
 */
export async function insertPost(data: NewPost): Promise<Post> {
  const [post] = await db.insert(posts).values(data).returning();
  return post;
}

/**
 * Update post
 */
export async function updatePost(
  uri: string,
  data: Partial<NewPost>
): Promise<Post> {
  const [post] = await db
    .update(posts)
    .set(data)
    .where(eq(posts.uri, uri))
    .returning();

  return post;
}

/**
 * Delete post
 */
export async function deletePost(uri: string): Promise<void> {
  await db.delete(posts).where(eq(posts.uri, uri));
}

/**
 * Get vote count for a post
 */
export async function getPostVoteCount(uri: string): Promise<number> {
  const post = await findPostByUri(uri);
  return post?.voteCount || 0;
}

/**
 * Recalculate and update hot score for a post
 */
export async function recalculateHotScore(uri: string): Promise<void> {
  const post = await findPostByUri(uri);
  if (!post) return;

  const voteCount = post.voteCount || 0;
  const ageInHours =
    (Date.now() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60);

  // Hot score algorithm: (votes - 1)^0.8 / (age + 2)^1.8
  const points = Math.max(voteCount - 1, 0);
  const gravity = 1.8;
  const timeDecay = Math.pow(ageInHours + 2, gravity);
  const voteWeight = Math.pow(points, 0.8);
  const hotScore = voteWeight / timeDecay;

  await db
    .update(posts)
    .set({ hotScore })
    .where(eq(posts.uri, uri));
}

/**
 * Increment comment count for a post
 */
export async function incrementCommentCount(uri: string): Promise<void> {
  await db
    .update(posts)
    .set({ commentCount: sql`${posts.commentCount} + 1` })
    .where(eq(posts.uri, uri));
}

/**
 * Decrement comment count for a post
 */
export async function decrementCommentCount(uri: string): Promise<void> {
  await db
    .update(posts)
    .set({ commentCount: sql`${posts.commentCount} - 1` })
    .where(eq(posts.uri, uri));
}

/**
 * Update vote count for a post (denormalized)
 */
export async function updatePostVoteCount(uri: string): Promise<void> {
  // Count up and down votes
  const result = await db
    .select({
      upVotes: sql<number>`COUNT(*) FILTER (WHERE ${votes.direction} = 'up')`,
      downVotes: sql<number>`COUNT(*) FILTER (WHERE ${votes.direction} = 'down')`,
    })
    .from(votes)
    .where(eq(votes.subjectUri, uri));

  const upVotes = Number(result[0]?.upVotes || 0);
  const downVotes = Number(result[0]?.downVotes || 0);
  const voteCount = upVotes - downVotes;

  await db
    .update(posts)
    .set({ voteCount })
    .where(eq(posts.uri, uri));
}
