import { db } from "../db.server";
import { bookmarks, posts, communities } from "../../../db/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import type { Bookmark, NewBookmark } from "../../../db/schema";

export interface BookmarkWithPost {
  bookmark: Bookmark;
  post: {
    uri: string;
    title: string | null;
    text: string;
    authorDid: string;
    createdAt: Date;
    voteCount: number;
    commentCount: number;
    communityId: string;
    communityName: string;
  };
}

/**
 * Add a bookmark
 */
export async function addBookmark(
  userId: string,
  postUri: string
): Promise<Bookmark> {
  const [bookmark] = await db
    .insert(bookmarks)
    .values({
      id: crypto.randomUUID(),
      userId,
      postUri,
    })
    .onConflictDoNothing()
    .returning();

  // If already exists, return existing
  if (!bookmark) {
    const existing = await db.query.bookmarks.findFirst({
      where: and(eq(bookmarks.userId, userId), eq(bookmarks.postUri, postUri)),
    });
    return existing!;
  }

  return bookmark;
}

/**
 * Remove a bookmark
 */
export async function removeBookmark(
  userId: string,
  postUri: string
): Promise<boolean> {
  const result = await db
    .delete(bookmarks)
    .where(and(eq(bookmarks.userId, userId), eq(bookmarks.postUri, postUri)))
    .returning({ id: bookmarks.id });

  return result.length > 0;
}

/**
 * Toggle a bookmark (add if not exists, remove if exists)
 */
export async function toggleBookmark(
  userId: string,
  postUri: string
): Promise<{ bookmarked: boolean }> {
  // Check if already bookmarked
  const existing = await db.query.bookmarks.findFirst({
    where: and(eq(bookmarks.userId, userId), eq(bookmarks.postUri, postUri)),
  });

  if (existing) {
    await removeBookmark(userId, postUri);
    return { bookmarked: false };
  } else {
    await addBookmark(userId, postUri);
    return { bookmarked: true };
  }
}

/**
 * Check if a post is bookmarked by user
 */
export async function isPostBookmarked(
  userId: string,
  postUri: string
): Promise<boolean> {
  const bookmark = await db.query.bookmarks.findFirst({
    where: and(eq(bookmarks.userId, userId), eq(bookmarks.postUri, postUri)),
  });

  return !!bookmark;
}

/**
 * Check if multiple posts are bookmarked by user
 */
export async function getBookmarkedPostUris(
  userId: string,
  postUris: string[]
): Promise<Set<string>> {
  if (postUris.length === 0) return new Set();

  const result = await db
    .select({ postUri: bookmarks.postUri })
    .from(bookmarks)
    .where(
      and(eq(bookmarks.userId, userId), inArray(bookmarks.postUri, postUris))
    );

  return new Set(result.map((r) => r.postUri));
}

/**
 * Get user's bookmarks with post data
 */
export async function getUserBookmarks(
  userId: string,
  options: {
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ bookmarks: BookmarkWithPost[]; total: number }> {
  const { limit = 20, offset = 0 } = options;

  // Get bookmarks with post data via join
  const results = await db
    .select({
      bookmark: bookmarks,
      post: {
        uri: posts.uri,
        title: posts.title,
        text: posts.text,
        authorDid: posts.authorDid,
        createdAt: posts.createdAt,
        voteCount: posts.voteCount,
        commentCount: posts.commentCount,
        communityId: posts.communityId,
      },
      communityName: communities.name,
    })
    .from(bookmarks)
    .innerJoin(posts, eq(bookmarks.postUri, posts.uri))
    .innerJoin(communities, eq(posts.communityId, communities.id))
    .where(eq(bookmarks.userId, userId))
    .orderBy(desc(bookmarks.createdAt))
    .limit(limit)
    .offset(offset);

  // Get total count
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(bookmarks)
    .where(eq(bookmarks.userId, userId));

  const bookmarksWithPosts: BookmarkWithPost[] = results.map((r) => ({
    bookmark: r.bookmark,
    post: {
      ...r.post,
      communityName: r.communityName,
    },
  }));

  return {
    bookmarks: bookmarksWithPosts,
    total: count || 0,
  };
}

/**
 * Get bookmark count for a user
 */
export async function getUserBookmarkCount(userId: string): Promise<number> {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(bookmarks)
    .where(eq(bookmarks.userId, userId));

  return count || 0;
}

/**
 * Delete all bookmarks for a post (when post is deleted)
 */
export async function deleteBookmarksForPost(postUri: string): Promise<number> {
  const result = await db
    .delete(bookmarks)
    .where(eq(bookmarks.postUri, postUri))
    .returning({ id: bookmarks.id });

  return result.length;
}
