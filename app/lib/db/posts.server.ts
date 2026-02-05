import { db } from '~/lib/db.server';
import { posts } from '../../../db/schema/posts';
import { votes } from '../../../db/schema/votes';
import { communities } from '../../../db/schema/communities';
import { eq, and, or, sql, desc, asc, inArray, ilike, gte, between } from 'drizzle-orm';
import type { Post, NewPost } from '../../../db/schema/posts';
import type { PostWithVotes } from '~/types/post';

// Time filter options
export type TimeFilter = 'hour' | 'today' | 'week' | 'month' | 'year' | 'all';

/**
 * Get date threshold for time filter
 */
function getTimeThreshold(timeFilter: TimeFilter): Date | null {
  const now = new Date();
  switch (timeFilter) {
    case 'hour':
      return new Date(now.getTime() - 60 * 60 * 1000);
    case 'today':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case 'week':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case 'month':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case 'year':
      return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    case 'all':
    default:
      return null;
  }
}

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
    timeFilter?: TimeFilter; // Time-based filtering
    includeRemoved?: boolean; // If true, include removed posts (for moderators)
    limit?: number;
    offset?: number;
    sortBy?: 'hot' | 'new' | 'top' | 'trending';
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
    timeFilter = 'all',
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

  // Apply time filter
  const timeThreshold = getTimeThreshold(timeFilter);
  if (timeThreshold) {
    conditions.push(gte(posts.createdAt, timeThreshold));
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
    case 'trending':
      // Trending: combines recency with engagement velocity
      // Uses a formula that weighs recent votes more heavily
      sortedQuery = baseQuery.orderBy(
        desc(posts.isPinned),
        desc(sql`(${posts.voteCount} + ${posts.commentCount} * 2) / POWER(EXTRACT(EPOCH FROM (NOW() - ${posts.createdAt})) / 3600 + 2, 1.5)`)
      );
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

/**
 * Get trending posts across all communities
 * Uses engagement velocity: (votes + comments*2) / age^1.5
 */
export async function getTrendingPosts(
  options: {
    limit?: number;
    timeFilter?: TimeFilter;
  } = {},
  userId?: string
): Promise<PostWithVotes[]> {
  const { limit = 10, timeFilter = 'today' } = options;

  // Get time threshold - default to last 24 hours for trending
  const timeThreshold = getTimeThreshold(timeFilter) || getTimeThreshold('today');

  const results = await db
    .select()
    .from(posts)
    .where(
      and(
        eq(posts.isRemoved, false),
        sql`${posts.replyRoot} IS NULL`, // Only top-level posts
        timeThreshold ? gte(posts.createdAt, timeThreshold) : undefined
      )
    )
    .orderBy(
      desc(sql`(${posts.voteCount} + ${posts.commentCount} * 2) / POWER(EXTRACT(EPOCH FROM (NOW() - ${posts.createdAt})) / 3600 + 2, 1.5)`)
    )
    .limit(limit);

  // Get user votes if authenticated
  if (userId && results.length > 0) {
    const postUris = results.map((p) => p.uri);
    const userVotes = await db
      .select()
      .from(votes)
      .where(and(eq(votes.authorDid, userId), inArray(votes.subjectUri, postUris)));

    const voteMap = new Map(userVotes.map((v) => [v.subjectUri, v.direction]));

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
 * Get rising posts - posts with recent upvote activity
 * Focuses on posts that are gaining traction quickly
 */
export async function getRisingPosts(
  options: {
    limit?: number;
  } = {},
  userId?: string
): Promise<PostWithVotes[]> {
  const { limit = 10 } = options;

  // Rising posts: created in last 12 hours with good engagement
  const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);

  const results = await db
    .select()
    .from(posts)
    .where(
      and(
        eq(posts.isRemoved, false),
        sql`${posts.replyRoot} IS NULL`,
        gte(posts.createdAt, twelveHoursAgo),
        gte(posts.voteCount, 2) // Minimum engagement threshold
      )
    )
    .orderBy(
      // Sort by votes per hour (velocity)
      desc(sql`${posts.voteCount}::float / (EXTRACT(EPOCH FROM (NOW() - ${posts.createdAt})) / 3600 + 0.5)`)
    )
    .limit(limit);

  // Get user votes if authenticated
  if (userId && results.length > 0) {
    const postUris = results.map((p) => p.uri);
    const userVotes = await db
      .select()
      .from(votes)
      .where(and(eq(votes.authorDid, userId), inArray(votes.subjectUri, postUris)));

    const voteMap = new Map(userVotes.map((v) => [v.subjectUri, v.direction]));

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
 * Search posts by query string (searches title and text)
 */
export async function searchPosts(
  query: string,
  options: {
    limit?: number;
    offset?: number;
    userId?: string;
  } = {}
): Promise<any[]> {
  const { limit = 20, offset = 0, userId } = options;

  if (!query.trim()) return [];

  const searchTerm = `%${query.trim()}%`;

  // Search posts and join with communities to get community name
  const results = await db
    .select({
      uri: posts.uri,
      rkey: posts.rkey,
      cid: posts.cid,
      authorDid: posts.authorDid,
      communityId: posts.communityId,
      title: posts.title,
      text: posts.text,
      embedType: posts.embedType,
      embedData: posts.embedData,
      tags: posts.tags,
      voteCount: posts.voteCount,
      commentCount: posts.commentCount,
      createdAt: posts.createdAt,
      isPinned: posts.isPinned,
      isLocked: posts.isLocked,
      isRemoved: posts.isRemoved,
      communityName: communities.name,
    })
    .from(posts)
    .innerJoin(communities, eq(posts.communityId, communities.id))
    .where(
      and(
        eq(posts.isRemoved, false),
        sql`${posts.replyRoot} IS NULL`, // Only top-level posts
        or(
          ilike(posts.title, searchTerm),
          ilike(posts.text, searchTerm)
        )
      )
    )
    .orderBy(desc(posts.voteCount), desc(posts.createdAt))
    .limit(limit)
    .offset(offset);

  // Get user votes if authenticated
  if (userId && results.length > 0) {
    const postUris = results.map((p) => p.uri);
    const userVotes = await db
      .select()
      .from(votes)
      .where(and(eq(votes.authorDid, userId), inArray(votes.subjectUri, postUris)));

    const voteMap = new Map(userVotes.map((v) => [v.subjectUri, v.direction]));

    return results.map((post) => ({
      ...post,
      userVote: voteMap.get(post.uri) || null,
    }));
  }

  return results.map((post) => ({
    ...post,
    userVote: null,
  }));
}
