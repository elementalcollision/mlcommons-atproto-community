import { findUserById } from '~/lib/db/users.server';
import { listPosts } from './post.server';
import { getUserSubscribedCommunities } from '~/lib/db/communities.server';
import { getUserBookmarks } from '~/lib/db/bookmarks.server';
import type { User } from '../../db/schema/users';
import type { PostWithVotes, ListPostsOptions } from '~/types/post';
import type { CommunityWithStats } from '~/types/community';

export interface UserProfile extends User {
  totalKarma: number;
  totalPosts: number;
  totalComments: number;
}

/**
 * Get user profile with aggregated stats
 */
export async function getUserProfile(
  userId: string,
  viewerId?: string
): Promise<UserProfile | null> {
  const user = await findUserById(userId);
  if (!user) return null;

  // Calculate total karma
  const totalKarma = (user.postKarma || 0) + (user.commentKarma || 0);

  // Get posts to count totals
  const allPosts = await listPosts(
    {
      authorDid: userId,
      limit: 1000, // Get all posts for counting
      sortBy: 'new',
    },
    viewerId
  );

  // Separate posts from comments
  const posts = allPosts.filter((p) => !p.replyRoot);
  const comments = allPosts.filter((p) => p.replyRoot);

  return {
    ...user,
    totalKarma,
    totalPosts: posts.length,
    totalComments: comments.length,
  };
}

/**
 * Get user's posts with pagination
 */
export async function getUserPosts(
  userId: string,
  options: ListPostsOptions = {},
  viewerId?: string
): Promise<PostWithVotes[]> {
  return await listPosts(
    {
      ...options,
      authorDid: userId,
      replyRoot: '', // Only top-level posts, not comments
    },
    viewerId
  );
}

/**
 * Get user's comments with pagination
 */
export async function getUserComments(
  userId: string,
  options: Omit<ListPostsOptions, 'replyRoot'> = {},
  viewerId?: string
): Promise<PostWithVotes[]> {
  // Get all posts by user
  const allPosts = await listPosts(
    {
      ...options,
      authorDid: userId,
    },
    viewerId
  );

  // Filter to only comments (posts with replyRoot)
  return allPosts.filter((p) => p.replyRoot);
}

/**
 * Get communities user has subscribed to
 */
export async function getUserCommunities(
  userId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<CommunityWithStats[]> {
  return await getUserSubscribedCommunities(userId, options);
}

/**
 * Get user's bookmarked/saved posts
 */
export async function getUserSavedPosts(
  userId: string,
  options: { limit?: number; offset?: number } = {},
  viewerId?: string
): Promise<any[]> {
  const { bookmarks } = await getUserBookmarks(userId, options);
  // Transform to a simpler format
  return bookmarks.map(b => ({
    uri: b.post.uri,
    title: b.post.title,
    text: b.post.text,
    authorDid: b.post.authorDid,
    createdAt: b.post.createdAt,
    voteCount: b.post.voteCount,
    commentCount: b.post.commentCount,
    communityId: b.post.communityId,
    communityName: b.post.communityName,
    userVote: null,
    replyRoot: null,
  }));
}
