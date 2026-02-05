import { db } from "../db.server";
import { userSettings } from "../../../db/schema";
import { eq } from "drizzle-orm";
import type { UserSettings, NewUserSettings } from "../../../db/schema";

export type Theme = "light" | "dark" | "system";
export type DefaultFeed = "all" | "subscribed";
export type DefaultSort = "hot" | "new" | "top" | "trending";

/**
 * Get user settings, creating default if not exists
 */
export async function getUserSettings(userId: string): Promise<UserSettings> {
  const existing = await db.query.userSettings.findFirst({
    where: eq(userSettings.userId, userId),
  });

  if (existing) return existing;

  // Create default settings
  const [settings] = await db
    .insert(userSettings)
    .values({ userId })
    .returning();

  return settings;
}

/**
 * Update user settings
 */
export async function updateUserSettings(
  userId: string,
  data: Partial<Omit<NewUserSettings, "userId">>
): Promise<UserSettings> {
  // Ensure settings exist first
  await getUserSettings(userId);

  // Update settings
  const [settings] = await db
    .update(userSettings)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(userSettings.userId, userId))
    .returning();

  return settings;
}

/**
 * Update theme preference
 */
export async function updateTheme(
  userId: string,
  theme: Theme
): Promise<UserSettings> {
  return updateUserSettings(userId, { theme });
}

/**
 * Update compact mode
 */
export async function updateCompactMode(
  userId: string,
  compactMode: boolean
): Promise<UserSettings> {
  return updateUserSettings(userId, { compactMode });
}

/**
 * Update notification preferences
 */
export async function updateNotificationPreferences(
  userId: string,
  preferences: {
    emailNotifications?: boolean;
    notifyReplies?: boolean;
    notifyMentions?: boolean;
    notifyVotes?: boolean;
    notifyCommunityUpdates?: boolean;
  }
): Promise<UserSettings> {
  return updateUserSettings(userId, preferences);
}

/**
 * Update feed preferences
 */
export async function updateFeedPreferences(
  userId: string,
  preferences: {
    defaultFeed?: DefaultFeed;
    defaultSort?: DefaultSort;
  }
): Promise<UserSettings> {
  return updateUserSettings(userId, preferences);
}

/**
 * Update privacy settings
 */
export async function updatePrivacySettings(
  userId: string,
  settings: {
    showOnlineStatus?: boolean;
    allowDirectMessages?: boolean;
  }
): Promise<UserSettings> {
  return updateUserSettings(userId, settings);
}

/**
 * Delete user settings (when user account is deleted)
 */
export async function deleteUserSettings(userId: string): Promise<boolean> {
  const result = await db
    .delete(userSettings)
    .where(eq(userSettings.userId, userId))
    .returning({ userId: userSettings.userId });

  return result.length > 0;
}

/**
 * Check if user should receive a specific notification type
 */
export async function shouldNotifyUser(
  userId: string,
  notificationType: "reply" | "mention" | "vote" | "community"
): Promise<boolean> {
  const settings = await getUserSettings(userId);

  switch (notificationType) {
    case "reply":
      return settings.notifyReplies;
    case "mention":
      return settings.notifyMentions;
    case "vote":
      return settings.notifyVotes;
    case "community":
      return settings.notifyCommunityUpdates;
    default:
      return true;
  }
}
