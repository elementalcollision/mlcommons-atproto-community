import { db } from '~/lib/db.server';
import { moderators } from '../../../db/schema/moderators';
import { eq, and } from 'drizzle-orm';
import type { Moderator, NewModerator } from '../../../db/schema/moderators';

/**
 * Find all moderators for a community
 */
export async function findModeratorsByCommunity(
  communityId: string
): Promise<Moderator[]> {
  return await db.query.moderators.findMany({
    where: eq(moderators.communityId, communityId),
  });
}

/**
 * Check if user is a moderator of a community
 */
export async function isUserModerator(
  userId: string,
  communityId: string
): Promise<boolean> {
  const moderator = await db.query.moderators.findFirst({
    where: and(
      eq(moderators.userDid, userId),
      eq(moderators.communityId, communityId)
    ),
  });

  return !!moderator;
}

/**
 * Get user's moderator role in a community
 */
export async function getUserModeratorRole(
  userId: string,
  communityId: string
): Promise<'admin' | 'moderator' | null> {
  const moderator = await db.query.moderators.findFirst({
    where: and(
      eq(moderators.userDid, userId),
      eq(moderators.communityId, communityId)
    ),
  });

  return moderator?.role || null;
}

/**
 * Add a moderator to a community
 */
export async function addModerator(
  communityId: string,
  userId: string,
  role: 'moderator' | 'admin' = 'moderator'
): Promise<Moderator> {
  const [moderator] = await db
    .insert(moderators)
    .values({
      id: crypto.randomUUID(),
      communityId,
      userDid: userId,
      role,
    })
    .returning();

  return moderator;
}

/**
 * Remove a moderator from a community
 */
export async function removeModerator(
  communityId: string,
  userId: string
): Promise<void> {
  await db
    .delete(moderators)
    .where(
      and(
        eq(moderators.communityId, communityId),
        eq(moderators.userDid, userId)
      )
    );
}

/**
 * Update moderator role
 */
export async function updateModeratorRole(
  communityId: string,
  userId: string,
  role: 'moderator' | 'admin'
): Promise<Moderator> {
  const [moderator] = await db
    .update(moderators)
    .set({ role })
    .where(
      and(
        eq(moderators.communityId, communityId),
        eq(moderators.userDid, userId)
      )
    )
    .returning();

  return moderator;
}
