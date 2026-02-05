import { db } from "../db.server";
import { communities, subscriptions, posts } from "../../../db/schema";
import { eq, and, sql, desc, asc, ilike, or, gte, notInArray, ne, inArray } from "drizzle-orm";
import type { Community, NewCommunity } from "../../../db/schema";
import type {
  CommunityWithStats,
  ListCommunitiesOptions,
} from "../../types/community";

/**
 * Find community by name
 */
export async function findCommunityByName(
  name: string
): Promise<Community | null> {
  const result = await db.query.communities.findFirst({
    where: eq(communities.name, name),
  });

  return result || null;
}

/**
 * Find community by ID
 */
export async function findCommunityById(id: string): Promise<Community | null> {
  const result = await db.query.communities.findFirst({
    where: eq(communities.id, id),
  });

  return result || null;
}

/**
 * Get community with member count and optional subscription status
 */
export async function getCommunityWithStats(
  name: string,
  userId?: string
): Promise<CommunityWithStats | null> {
  const community = await findCommunityByName(name);
  if (!community) return null;

  // Get member count
  const memberCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(subscriptions)
    .where(eq(subscriptions.communityId, community.id))
    .then((rows) => rows[0]?.count || 0);

  // Check if user is subscribed (if userId provided)
  let isSubscribed = false;
  if (userId) {
    const subscription = await db.query.subscriptions.findFirst({
      where: and(
        eq(subscriptions.userDid, userId),
        eq(subscriptions.communityId, community.id)
      ),
    });
    isSubscribed = !!subscription;
  }

  return {
    ...community,
    memberCount: community.memberCount || memberCount, // Use cached count or query
    postCount: community.postCount || 0,
    isSubscribed,
  };
}

/**
 * Insert new community
 */
export async function insertCommunity(data: NewCommunity): Promise<Community> {
  const [community] = await db.insert(communities).values(data).returning();
  return community;
}

/**
 * Update community
 */
export async function updateCommunity(
  id: string,
  data: Partial<NewCommunity>
): Promise<Community> {
  const [community] = await db
    .update(communities)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(communities.id, id))
    .returning();

  return community;
}

/**
 * Delete community
 */
export async function deleteCommunity(id: string): Promise<void> {
  await db.delete(communities).where(eq(communities.id, id));
}

/**
 * List communities with optional filtering and sorting
 */
export async function listCommunities(
  options: ListCommunitiesOptions = {},
  userId?: string
): Promise<CommunityWithStats[]> {
  const { limit = 20, offset = 0, sortBy = "members", search } = options;

  // Build query with all conditions
  const baseQuery = db.select().from(communities);

  // Apply search filter
  const whereClause = search
    ? or(
        ilike(communities.name, `%${search}%`),
        ilike(communities.displayName, `%${search}%`),
        ilike(communities.description, `%${search}%`)
      )
    : undefined;

  // Apply sorting
  const orderByClause = (() => {
    switch (sortBy) {
      case "members":
        return desc(communities.memberCount);
      case "posts":
        return desc(communities.postCount);
      case "created":
        return desc(communities.createdAt);
      case "name":
        return asc(communities.name);
      default:
        return desc(communities.memberCount);
    }
  })();

  // Execute query with all clauses
  const results = await (whereClause
    ? baseQuery
        .where(whereClause)
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset)
    : baseQuery.orderBy(orderByClause).limit(limit).offset(offset));

  // Add subscription status if userId provided
  if (userId) {
    const userSubscriptions = await db
      .select({ communityId: subscriptions.communityId })
      .from(subscriptions)
      .where(eq(subscriptions.userDid, userId));

    const subscribedIds = new Set(
      userSubscriptions.map((s) => s.communityId)
    );

    return results.map((c) => ({
      ...c,
      memberCount: c.memberCount || 0,
      postCount: c.postCount || 0,
      isSubscribed: subscribedIds.has(c.id),
    }));
  }

  return results.map((c) => ({
    ...c,
    memberCount: c.memberCount || 0,
    postCount: c.postCount || 0,
  }));
}

/**
 * Get user's subscribed communities
 */
export async function getUserCommunities(
  userId: string
): Promise<CommunityWithStats[]> {
  const results = await db
    .select({
      community: communities,
    })
    .from(subscriptions)
    .innerJoin(communities, eq(subscriptions.communityId, communities.id))
    .where(eq(subscriptions.userDid, userId))
    .orderBy(asc(communities.name));

  return results.map(({ community }) => ({
    ...community,
    memberCount: community.memberCount || 0,
    postCount: community.postCount || 0,
    isSubscribed: true,
  }));
}

/**
 * Check if user is subscribed to community
 */
export async function isUserSubscribed(
  userId: string,
  communityId: string
): Promise<boolean> {
  const subscription = await db.query.subscriptions.findFirst({
    where: and(
      eq(subscriptions.userDid, userId),
      eq(subscriptions.communityId, communityId)
    ),
  });

  return !!subscription;
}

/**
 * Subscribe user to community
 */
export async function subscribeUserToCommunity(
  userId: string,
  communityId: string
): Promise<void> {
  await db.insert(subscriptions).values({
    id: crypto.randomUUID(),
    userDid: userId,
    communityId,
  });

  // Increment member count
  await db
    .update(communities)
    .set({ memberCount: sql`${communities.memberCount} + 1` })
    .where(eq(communities.id, communityId));
}

/**
 * Unsubscribe user from community
 */
export async function unsubscribeUserFromCommunity(
  userId: string,
  communityId: string
): Promise<void> {
  await db
    .delete(subscriptions)
    .where(
      and(
        eq(subscriptions.userDid, userId),
        eq(subscriptions.communityId, communityId)
      )
    );

  // Decrement member count
  await db
    .update(communities)
    .set({ memberCount: sql`${communities.memberCount} - 1` })
    .where(eq(communities.id, communityId));
}

/**
 * Get user's subscribed community IDs
 */
export async function getUserSubscribedCommunityIds(
  userId: string
): Promise<string[]> {
  const results = await db
    .select({ communityId: subscriptions.communityId })
    .from(subscriptions)
    .where(eq(subscriptions.userDid, userId));

  return results.map((r) => r.communityId);
}

/**
 * Get user's subscribed communities with full details
 */
export async function getUserSubscribedCommunities(
  userId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<CommunityWithStats[]> {
  const { limit = 20, offset = 0 } = options;

  const results = await db
    .select({
      community: communities,
      postCount: sql<number>`(
        SELECT COUNT(*) FROM posts
        WHERE posts.community_id = ${communities.id}
        AND posts.reply_root IS NULL
      )::int`,
    })
    .from(communities)
    .innerJoin(subscriptions, eq(communities.id, subscriptions.communityId))
    .where(eq(subscriptions.userDid, userId))
    .orderBy(desc(subscriptions.createdAt))
    .limit(limit)
    .offset(offset);

  return results.map((r) => ({
    ...r.community,
    postCount: r.postCount,
    isSubscribed: true,
  }));
}

/**
 * Get trending communities (most new members in last 7 days + activity)
 */
export async function getTrendingCommunities(
  options: {
    limit?: number;
    excludeIds?: string[];
  } = {},
  userId?: string
): Promise<CommunityWithStats[]> {
  const { limit = 5, excludeIds = [] } = options;

  // Calculate a trending score based on:
  // - Recent member growth (subscriptions in last 7 days)
  // - Recent post activity
  // - Total member count (for baseline popularity)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Get communities with recent activity
  const results = await db
    .select({
      community: communities,
      recentPosts: sql<number>`(
        SELECT COUNT(*) FROM posts
        WHERE posts.community_id = ${communities.id}
        AND posts.created_at > ${sevenDaysAgo}
        AND posts.reply_root IS NULL
      )::int`,
    })
    .from(communities)
    .where(
      excludeIds.length > 0
        ? notInArray(communities.id, excludeIds)
        : undefined
    )
    .orderBy(
      // Trending score: weighs recent posts heavily, with member count as baseline
      desc(sql`(${communities.memberCount} * 0.3) + (
        SELECT COUNT(*) FROM posts
        WHERE posts.community_id = ${communities.id}
        AND posts.created_at > ${sevenDaysAgo}
      ) * 2`)
    )
    .limit(limit);

  // Get subscription status if userId provided
  let subscribedIds = new Set<string>();
  if (userId) {
    const userSubscriptions = await db
      .select({ communityId: subscriptions.communityId })
      .from(subscriptions)
      .where(eq(subscriptions.userDid, userId));
    subscribedIds = new Set(userSubscriptions.map((s) => s.communityId));
  }

  return results.map(({ community, recentPosts }) => ({
    ...community,
    memberCount: community.memberCount || 0,
    postCount: community.postCount || 0,
    isSubscribed: subscribedIds.has(community.id),
    recentPosts,
  }));
}

/**
 * Get recommended communities for a user
 * Based on: not subscribed, popular, recently active
 */
export async function getRecommendedCommunities(
  userId: string,
  limit: number = 5
): Promise<CommunityWithStats[]> {
  // Get user's subscribed communities to exclude
  const subscribedIds = await getUserSubscribedCommunityIds(userId);

  // Get popular communities user hasn't joined
  const results = await db
    .select()
    .from(communities)
    .where(
      subscribedIds.length > 0
        ? notInArray(communities.id, subscribedIds)
        : undefined
    )
    .orderBy(
      // Sort by a combination of members and activity
      desc(sql`${communities.memberCount} + ${communities.postCount} * 0.5`)
    )
    .limit(limit);

  return results.map((c) => ({
    ...c,
    memberCount: c.memberCount || 0,
    postCount: c.postCount || 0,
    isSubscribed: false,
  }));
}

/**
 * Get new/recently created communities
 */
export async function getNewCommunities(
  options: {
    limit?: number;
    daysOld?: number;
  } = {},
  userId?: string
): Promise<CommunityWithStats[]> {
  const { limit = 5, daysOld = 30 } = options;

  const threshold = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

  const results = await db
    .select()
    .from(communities)
    .where(gte(communities.createdAt, threshold))
    .orderBy(desc(communities.createdAt))
    .limit(limit);

  // Get subscription status if userId provided
  let subscribedIds = new Set<string>();
  if (userId) {
    const userSubscriptions = await db
      .select({ communityId: subscriptions.communityId })
      .from(subscriptions)
      .where(eq(subscriptions.userDid, userId));
    subscribedIds = new Set(userSubscriptions.map((s) => s.communityId));
  }

  return results.map((c) => ({
    ...c,
    memberCount: c.memberCount || 0,
    postCount: c.postCount || 0,
    isSubscribed: subscribedIds.has(c.id),
  }));
}

/**
 * Get community statistics summary
 */
export async function getCommunityStats(): Promise<{
  totalCommunities: number;
  totalMembers: number;
  totalPosts: number;
}> {
  const result = await db
    .select({
      totalCommunities: sql<number>`COUNT(*)::int`,
      totalMembers: sql<number>`COALESCE(SUM(${communities.memberCount}), 0)::int`,
      totalPosts: sql<number>`COALESCE(SUM(${communities.postCount}), 0)::int`,
    })
    .from(communities);

  return {
    totalCommunities: result[0]?.totalCommunities || 0,
    totalMembers: result[0]?.totalMembers || 0,
    totalPosts: result[0]?.totalPosts || 0,
  };
}

/**
 * Search communities by name or description
 */
export async function searchCommunities(
  query: string,
  options: {
    limit?: number;
    offset?: number;
    userId?: string;
  } = {}
): Promise<CommunityWithStats[]> {
  const { limit = 20, offset = 0, userId } = options;

  if (!query.trim()) return [];

  const searchTerm = `%${query.trim()}%`;

  const results = await db
    .select()
    .from(communities)
    .where(
      or(
        ilike(communities.name, searchTerm),
        ilike(communities.displayName, searchTerm),
        ilike(communities.description, searchTerm)
      )
    )
    .orderBy(desc(communities.memberCount), desc(communities.postCount))
    .limit(limit)
    .offset(offset);

  // Get subscription status if logged in
  let subscribedIds = new Set<string>();
  if (userId && results.length > 0) {
    const communityIds = results.map((c) => c.id);
    const subs = await db
      .select({ communityId: subscriptions.communityId })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userDid, userId),
          inArray(subscriptions.communityId, communityIds)
        )
      );
    subscribedIds = new Set(subs.map((s) => s.communityId));
  }

  return results.map((community) => ({
    ...community,
    memberCount: community.memberCount || 0,
    postCount: community.postCount || 0,
    isSubscribed: subscribedIds.has(community.id),
  }));
}
