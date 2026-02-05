import { db } from "../db.server";
import {
  moderationActions,
  communityBans,
  communityRules,
  postFlairs,
  moderators,
  posts,
  communities,
} from "../../../db/schema";
import { eq, and, desc, sql, gt, or, isNull, lt } from "drizzle-orm";
import type {
  ModerationAction,
  NewModerationAction,
  CommunityBan,
  NewCommunityBan,
  CommunityRule,
  NewCommunityRule,
  PostFlair,
  NewPostFlair,
} from "../../../db/schema";
import { notifyModeratorAction } from "./notifications.server";

// ============================================
// Permission Checks
// ============================================

/**
 * Check if a user is a moderator of a community
 */
export async function isModerator(
  communityId: string,
  userDid: string
): Promise<boolean> {
  const mod = await db.query.moderators.findFirst({
    where: and(
      eq(moderators.communityId, communityId),
      eq(moderators.userDid, userDid)
    ),
  });
  return !!mod;
}

/**
 * Check if a user is the creator (owner) of a community
 */
export async function isOwner(
  communityId: string,
  userDid: string
): Promise<boolean> {
  const community = await db.query.communities.findFirst({
    where: eq(communities.id, communityId),
  });
  return community?.creatorDid === userDid;
}

/**
 * Check if a user has moderation permissions (owner or moderator)
 */
export async function canModerate(
  communityId: string,
  userDid: string
): Promise<boolean> {
  const [owner, mod] = await Promise.all([
    isOwner(communityId, userDid),
    isModerator(communityId, userDid),
  ]);
  return owner || mod;
}

/**
 * Check if a user is banned from a community
 */
export async function isUserBanned(
  communityId: string,
  userDid: string
): Promise<{ banned: boolean; ban?: CommunityBan }> {
  const ban = await db.query.communityBans.findFirst({
    where: and(
      eq(communityBans.communityId, communityId),
      eq(communityBans.userDid, userDid),
      or(
        eq(communityBans.isPermanent, true),
        gt(communityBans.expiresAt, new Date())
      )
    ),
  });

  return { banned: !!ban, ban: ban || undefined };
}

// ============================================
// Post Moderation
// ============================================

/**
 * Remove a post
 */
export async function removePost(
  postUri: string,
  moderatorDid: string,
  reason: string
): Promise<void> {
  const post = await db.query.posts.findFirst({
    where: eq(posts.uri, postUri),
  });

  if (!post) throw new Error("Post not found");

  // Check permissions
  const hasPermission = await canModerate(post.communityId, moderatorDid);
  if (!hasPermission) throw new Error("No permission to moderate this community");

  // Update post
  await db
    .update(posts)
    .set({ isRemoved: true })
    .where(eq(posts.uri, postUri));

  // Log action
  await logModerationAction({
    communityId: post.communityId,
    moderatorDid,
    action: "remove_post",
    targetPostUri: postUri,
    reason,
  });

  // Notify post author
  const community = await db.query.communities.findFirst({
    where: eq(communities.id, post.communityId),
  });

  if (community) {
    await notifyModeratorAction(
      post.authorDid,
      post.communityId,
      community.name,
      "Your post was removed",
      reason
    );
  }
}

/**
 * Restore a removed post
 */
export async function restorePost(
  postUri: string,
  moderatorDid: string,
  reason?: string
): Promise<void> {
  const post = await db.query.posts.findFirst({
    where: eq(posts.uri, postUri),
  });

  if (!post) throw new Error("Post not found");

  const hasPermission = await canModerate(post.communityId, moderatorDid);
  if (!hasPermission) throw new Error("No permission to moderate this community");

  await db
    .update(posts)
    .set({ isRemoved: false })
    .where(eq(posts.uri, postUri));

  await logModerationAction({
    communityId: post.communityId,
    moderatorDid,
    action: "restore_post",
    targetPostUri: postUri,
    reason,
  });
}

/**
 * Pin/unpin a post
 */
export async function togglePinPost(
  postUri: string,
  moderatorDid: string,
  pin: boolean
): Promise<void> {
  const post = await db.query.posts.findFirst({
    where: eq(posts.uri, postUri),
  });

  if (!post) throw new Error("Post not found");

  const hasPermission = await canModerate(post.communityId, moderatorDid);
  if (!hasPermission) throw new Error("No permission to moderate this community");

  await db
    .update(posts)
    .set({ isPinned: pin })
    .where(eq(posts.uri, postUri));

  await logModerationAction({
    communityId: post.communityId,
    moderatorDid,
    action: pin ? "pin_post" : "unpin_post",
    targetPostUri: postUri,
  });
}

/**
 * Lock/unlock a post (prevent new comments)
 */
export async function toggleLockPost(
  postUri: string,
  moderatorDid: string,
  lock: boolean,
  reason?: string
): Promise<void> {
  const post = await db.query.posts.findFirst({
    where: eq(posts.uri, postUri),
  });

  if (!post) throw new Error("Post not found");

  const hasPermission = await canModerate(post.communityId, moderatorDid);
  if (!hasPermission) throw new Error("No permission to moderate this community");

  await db
    .update(posts)
    .set({ isLocked: lock })
    .where(eq(posts.uri, postUri));

  await logModerationAction({
    communityId: post.communityId,
    moderatorDid,
    action: lock ? "lock_post" : "unlock_post",
    targetPostUri: postUri,
    reason,
  });
}

// ============================================
// User Bans
// ============================================

/**
 * Ban a user from a community
 */
export async function banUser(
  communityId: string,
  targetUserDid: string,
  moderatorDid: string,
  reason: string,
  duration?: string // '1d', '7d', '30d', 'permanent'
): Promise<CommunityBan> {
  // Check permissions
  const hasPermission = await canModerate(communityId, moderatorDid);
  if (!hasPermission) throw new Error("No permission to moderate this community");

  // Can't ban yourself
  if (targetUserDid === moderatorDid) {
    throw new Error("Cannot ban yourself");
  }

  // Check if target is owner
  const targetIsOwner = await isOwner(communityId, targetUserDid);
  if (targetIsOwner) {
    throw new Error("Cannot ban the community owner");
  }

  // Calculate expiration
  let expiresAt: Date | null = null;
  const isPermanent = !duration || duration === "permanent";

  if (!isPermanent) {
    const now = new Date();
    switch (duration) {
      case "1d":
        expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        break;
      case "7d":
        expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        break;
    }
  }

  // Remove any existing bans first
  await db
    .delete(communityBans)
    .where(
      and(
        eq(communityBans.communityId, communityId),
        eq(communityBans.userDid, targetUserDid)
      )
    );

  // Create ban
  const [ban] = await db
    .insert(communityBans)
    .values({
      id: crypto.randomUUID(),
      communityId,
      userDid: targetUserDid,
      moderatorDid,
      reason,
      isPermanent,
      expiresAt,
    })
    .returning();

  // Log action
  await logModerationAction({
    communityId,
    moderatorDid,
    action: "ban_user",
    targetUserDid,
    reason,
    duration: duration || "permanent",
    expiresAt,
  });

  // Notify user
  const community = await db.query.communities.findFirst({
    where: eq(communities.id, communityId),
  });

  if (community) {
    const durationText = isPermanent
      ? "permanently"
      : `for ${duration?.replace("d", " days")}`;
    await notifyModeratorAction(
      targetUserDid,
      communityId,
      community.name,
      `You have been banned ${durationText}`,
      reason
    );
  }

  return ban;
}

/**
 * Unban a user from a community
 */
export async function unbanUser(
  communityId: string,
  targetUserDid: string,
  moderatorDid: string,
  reason?: string
): Promise<void> {
  const hasPermission = await canModerate(communityId, moderatorDid);
  if (!hasPermission) throw new Error("No permission to moderate this community");

  await db
    .delete(communityBans)
    .where(
      and(
        eq(communityBans.communityId, communityId),
        eq(communityBans.userDid, targetUserDid)
      )
    );

  await logModerationAction({
    communityId,
    moderatorDid,
    action: "unban_user",
    targetUserDid,
    reason,
  });

  // Notify user
  const community = await db.query.communities.findFirst({
    where: eq(communities.id, communityId),
  });

  if (community) {
    await notifyModeratorAction(
      targetUserDid,
      communityId,
      community.name,
      "Your ban has been lifted",
      reason
    );
  }
}

/**
 * Get banned users in a community
 */
export async function getCommunityBans(
  communityId: string
): Promise<CommunityBan[]> {
  return db.query.communityBans.findMany({
    where: eq(communityBans.communityId, communityId),
    orderBy: desc(communityBans.createdAt),
  });
}

// ============================================
// Community Rules
// ============================================

/**
 * Get community rules
 */
export async function getCommunityRules(
  communityId: string
): Promise<CommunityRule[]> {
  return db.query.communityRules.findMany({
    where: eq(communityRules.communityId, communityId),
    orderBy: communityRules.orderIndex,
  });
}

/**
 * Add a community rule
 */
export async function addCommunityRule(
  communityId: string,
  moderatorDid: string,
  data: { title: string; description?: string }
): Promise<CommunityRule> {
  const hasPermission = await canModerate(communityId, moderatorDid);
  if (!hasPermission) throw new Error("No permission to moderate this community");

  // Get next order index
  const existingRules = await getCommunityRules(communityId);
  const nextIndex = (existingRules.length + 1).toString().padStart(2, "0");

  const [rule] = await db
    .insert(communityRules)
    .values({
      id: crypto.randomUUID(),
      communityId,
      orderIndex: nextIndex,
      title: data.title,
      description: data.description,
    })
    .returning();

  await logModerationAction({
    communityId,
    moderatorDid,
    action: "update_rules",
    details: JSON.stringify({ added: data.title }),
  });

  return rule;
}

/**
 * Update a community rule
 */
export async function updateCommunityRule(
  ruleId: string,
  moderatorDid: string,
  data: { title?: string; description?: string; orderIndex?: string }
): Promise<CommunityRule> {
  const rule = await db.query.communityRules.findFirst({
    where: eq(communityRules.id, ruleId),
  });

  if (!rule) throw new Error("Rule not found");

  const hasPermission = await canModerate(rule.communityId, moderatorDid);
  if (!hasPermission) throw new Error("No permission to modify this rule");

  const [updated] = await db
    .update(communityRules)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(communityRules.id, ruleId))
    .returning();

  return updated;
}

/**
 * Delete a community rule
 */
export async function deleteCommunityRule(
  ruleId: string,
  moderatorDid: string
): Promise<void> {
  const rule = await db.query.communityRules.findFirst({
    where: eq(communityRules.id, ruleId),
  });

  if (!rule) throw new Error("Rule not found");

  const hasPermission = await canModerate(rule.communityId, moderatorDid);
  if (!hasPermission) throw new Error("No permission to delete this rule");

  await db.delete(communityRules).where(eq(communityRules.id, ruleId));

  await logModerationAction({
    communityId: rule.communityId,
    moderatorDid,
    action: "update_rules",
    details: JSON.stringify({ removed: rule.title }),
  });
}

// ============================================
// Post Flairs
// ============================================

/**
 * Get community flairs
 */
export async function getCommunityFlairs(
  communityId: string
): Promise<PostFlair[]> {
  return db.query.postFlairs.findMany({
    where: eq(postFlairs.communityId, communityId),
    orderBy: postFlairs.name,
  });
}

/**
 * Add a post flair
 */
export async function addPostFlair(
  communityId: string,
  moderatorDid: string,
  data: { name: string; color?: string; backgroundColor?: string; isModOnly?: boolean }
): Promise<PostFlair> {
  const hasPermission = await canModerate(communityId, moderatorDid);
  if (!hasPermission) throw new Error("No permission to add flairs");

  const [flair] = await db
    .insert(postFlairs)
    .values({
      id: crypto.randomUUID(),
      communityId,
      name: data.name,
      color: data.color,
      backgroundColor: data.backgroundColor,
      isModOnly: data.isModOnly || false,
    })
    .returning();

  await logModerationAction({
    communityId,
    moderatorDid,
    action: "add_flair",
    details: JSON.stringify({ name: data.name }),
  });

  return flair;
}

/**
 * Delete a post flair
 */
export async function deletePostFlair(
  flairId: string,
  moderatorDid: string
): Promise<void> {
  const flair = await db.query.postFlairs.findFirst({
    where: eq(postFlairs.id, flairId),
  });

  if (!flair) throw new Error("Flair not found");

  const hasPermission = await canModerate(flair.communityId, moderatorDid);
  if (!hasPermission) throw new Error("No permission to delete this flair");

  await db.delete(postFlairs).where(eq(postFlairs.id, flairId));

  await logModerationAction({
    communityId: flair.communityId,
    moderatorDid,
    action: "remove_flair",
    details: JSON.stringify({ name: flair.name }),
  });
}

/**
 * Set flair on a post
 */
export async function setPostFlair(
  postUri: string,
  flairId: string | null,
  userDid: string
): Promise<void> {
  const post = await db.query.posts.findFirst({
    where: eq(posts.uri, postUri),
  });

  if (!post) throw new Error("Post not found");

  // Check if user is post author or moderator
  const isAuthor = post.authorDid === userDid;
  const hasModerationPermission = await canModerate(post.communityId, userDid);

  if (!isAuthor && !hasModerationPermission) {
    throw new Error("No permission to set flair on this post");
  }

  // If setting a flair, verify it exists and check permissions
  if (flairId) {
    const flair = await db.query.postFlairs.findFirst({
      where: eq(postFlairs.id, flairId),
    });

    if (!flair || flair.communityId !== post.communityId) {
      throw new Error("Invalid flair for this community");
    }

    // If mod-only flair, check mod permissions
    if (flair.isModOnly && !hasModerationPermission) {
      throw new Error("This flair can only be applied by moderators");
    }
  }

  // Update post tags to include flair
  const tags = flairId ? [flairId] : null;
  await db
    .update(posts)
    .set({ tags })
    .where(eq(posts.uri, postUri));
}

// ============================================
// Moderation Log
// ============================================

/**
 * Log a moderation action
 */
async function logModerationAction(
  data: Omit<NewModerationAction, "id">
): Promise<ModerationAction> {
  const [action] = await db
    .insert(moderationActions)
    .values({
      id: crypto.randomUUID(),
      ...data,
    })
    .returning();

  return action;
}

/**
 * Get moderation log for a community
 */
export async function getModerationLog(
  communityId: string,
  options: {
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ actions: ModerationAction[]; total: number }> {
  const { limit = 50, offset = 0 } = options;

  const actions = await db.query.moderationActions.findMany({
    where: eq(moderationActions.communityId, communityId),
    orderBy: desc(moderationActions.createdAt),
    limit,
    offset,
  });

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(moderationActions)
    .where(eq(moderationActions.communityId, communityId));

  return { actions, total: count || 0 };
}

// ============================================
// Moderator Management
// ============================================

/**
 * Add a moderator to a community
 */
export async function addModerator(
  communityId: string,
  targetUserDid: string,
  adderDid: string,
  role: "moderator" | "admin" = "moderator"
): Promise<void> {
  // Only owner can add moderators
  const isUserOwner = await isOwner(communityId, adderDid);
  if (!isUserOwner) throw new Error("Only the owner can add moderators");

  await db
    .insert(moderators)
    .values({
      id: crypto.randomUUID(),
      communityId,
      userDid: targetUserDid,
      role,
    })
    .onConflictDoNothing();

  await logModerationAction({
    communityId,
    moderatorDid: adderDid,
    action: "add_moderator",
    targetUserDid,
    details: JSON.stringify({ role }),
  });

  // Notify new moderator
  const community = await db.query.communities.findFirst({
    where: eq(communities.id, communityId),
  });

  if (community) {
    await notifyModeratorAction(
      targetUserDid,
      communityId,
      community.name,
      `You are now a ${role} of c/${community.name}`,
      undefined
    );
  }
}

/**
 * Remove a moderator from a community
 */
export async function removeModerator(
  communityId: string,
  targetUserDid: string,
  removerDid: string
): Promise<void> {
  // Only owner can remove moderators
  const isUserOwner = await isOwner(communityId, removerDid);
  if (!isUserOwner) throw new Error("Only the owner can remove moderators");

  await db
    .delete(moderators)
    .where(
      and(
        eq(moderators.communityId, communityId),
        eq(moderators.userDid, targetUserDid)
      )
    );

  await logModerationAction({
    communityId,
    moderatorDid: removerDid,
    action: "remove_moderator",
    targetUserDid,
  });
}

/**
 * Get moderators for a community
 */
export async function getCommunityModerators(communityId: string) {
  return db.query.moderators.findMany({
    where: eq(moderators.communityId, communityId),
    orderBy: moderators.createdAt,
  });
}
