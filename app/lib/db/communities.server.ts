import { db } from "../db.server";
import { communities, subscriptions } from "../../../db/schema";
import { eq, and, sql, desc, asc, ilike, or } from "drizzle-orm";
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
