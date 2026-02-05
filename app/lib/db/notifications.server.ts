import { db } from "../db.server";
import { notifications } from "../../../db/schema";
import { eq, and, desc, sql, lt, isNull, or } from "drizzle-orm";
import type { Notification, NewNotification } from "../../../db/schema";

/**
 * Create a new notification
 */
export async function createNotification(
  data: Omit<NewNotification, "id">
): Promise<Notification> {
  const [notification] = await db
    .insert(notifications)
    .values({
      id: crypto.randomUUID(),
      ...data,
    })
    .returning();

  return notification;
}

/**
 * Create multiple notifications at once (for batch operations)
 */
export async function createNotifications(
  items: Omit<NewNotification, "id">[]
): Promise<Notification[]> {
  if (items.length === 0) return [];

  const values = items.map((item) => ({
    id: crypto.randomUUID(),
    ...item,
  }));

  const result = await db.insert(notifications).values(values).returning();
  return result;
}

/**
 * Get user's notifications with pagination
 */
export async function getUserNotifications(
  userId: string,
  options: {
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
  } = {}
): Promise<{ notifications: Notification[]; unreadCount: number }> {
  const { limit = 20, offset = 0, unreadOnly = false } = options;

  // Build where clause
  const whereClause = unreadOnly
    ? and(eq(notifications.userId, userId), eq(notifications.isRead, false))
    : eq(notifications.userId, userId);

  // Get notifications
  const notificationList = await db
    .select()
    .from(notifications)
    .where(whereClause)
    .orderBy(desc(notifications.createdAt))
    .limit(limit)
    .offset(offset);

  // Get unread count
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(
      and(eq(notifications.userId, userId), eq(notifications.isRead, false))
    );

  return {
    notifications: notificationList,
    unreadCount: count || 0,
  };
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadNotificationCount(
  userId: string
): Promise<number> {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(
      and(eq(notifications.userId, userId), eq(notifications.isRead, false))
    );

  return count || 0;
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(
  notificationId: string,
  userId: string
): Promise<boolean> {
  const result = await db
    .update(notifications)
    .set({ isRead: true, readAt: new Date() })
    .where(
      and(eq(notifications.id, notificationId), eq(notifications.userId, userId))
    )
    .returning({ id: notifications.id });

  return result.length > 0;
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(
  userId: string
): Promise<number> {
  const result = await db
    .update(notifications)
    .set({ isRead: true, readAt: new Date() })
    .where(
      and(eq(notifications.userId, userId), eq(notifications.isRead, false))
    )
    .returning({ id: notifications.id });

  return result.length;
}

/**
 * Delete a notification
 */
export async function deleteNotification(
  notificationId: string,
  userId: string
): Promise<boolean> {
  const result = await db
    .delete(notifications)
    .where(
      and(eq(notifications.id, notificationId), eq(notifications.userId, userId))
    )
    .returning({ id: notifications.id });

  return result.length > 0;
}

/**
 * Delete old notifications (cleanup job)
 * Default: delete notifications older than 30 days that have been read
 */
export async function deleteOldNotifications(
  daysOld: number = 30
): Promise<number> {
  const threshold = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

  const result = await db
    .delete(notifications)
    .where(
      and(eq(notifications.isRead, true), lt(notifications.createdAt, threshold))
    )
    .returning({ id: notifications.id });

  return result.length;
}

// ============================================
// Notification Creation Helpers
// ============================================

/**
 * Create a reply notification
 */
export async function notifyReply(
  userId: string,
  actorId: string,
  postUri: string,
  communityName: string,
  actorName: string
): Promise<Notification | null> {
  // Don't notify yourself
  if (userId === actorId) return null;

  return createNotification({
    userId,
    type: "reply",
    actorId,
    postUri,
    title: `${actorName} replied to your post`,
    link: `/c/${communityName}/p/${encodeURIComponent(postUri)}`,
  });
}

/**
 * Create a mention notification
 */
export async function notifyMention(
  userId: string,
  actorId: string,
  postUri: string,
  communityName: string,
  actorName: string
): Promise<Notification | null> {
  // Don't notify yourself
  if (userId === actorId) return null;

  return createNotification({
    userId,
    type: "mention",
    actorId,
    postUri,
    title: `${actorName} mentioned you`,
    link: `/c/${communityName}/p/${encodeURIComponent(postUri)}`,
  });
}

/**
 * Create a vote milestone notification
 * Used for batched vote notifications (e.g., "Your post reached 10 upvotes")
 */
export async function notifyVoteMilestone(
  userId: string,
  postUri: string,
  voteCount: number,
  communityName: string,
  postTitle: string
): Promise<Notification> {
  return createNotification({
    userId,
    type: "vote",
    postUri,
    title: `Your post reached ${voteCount} votes`,
    body: postTitle.length > 50 ? postTitle.substring(0, 47) + "..." : postTitle,
    link: `/c/${communityName}/p/${encodeURIComponent(postUri)}`,
  });
}

/**
 * Create a community notification
 */
export async function notifyCommunityUpdate(
  userIds: string[],
  communityId: string,
  communityName: string,
  title: string,
  body?: string
): Promise<Notification[]> {
  const items = userIds.map((userId) => ({
    userId,
    type: "community" as const,
    communityId,
    title,
    body,
    link: `/c/${communityName}`,
  }));

  return createNotifications(items);
}

/**
 * Create a moderator action notification
 */
export async function notifyModeratorAction(
  userId: string,
  communityId: string,
  communityName: string,
  title: string,
  body?: string
): Promise<Notification> {
  return createNotification({
    userId,
    type: "moderator",
    communityId,
    title,
    body,
    link: `/c/${communityName}`,
  });
}
