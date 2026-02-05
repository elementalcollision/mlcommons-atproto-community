import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { requireAuth } from "~/lib/auth/require-auth.server";
import {
  getUserSettings,
  updateUserSettings,
  type Theme,
  type DefaultFeed,
  type DefaultSort,
} from "~/lib/db/user-settings.server";

/**
 * GET /api/settings
 * Fetch user's settings
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const auth = await requireAuth(request);
  const settings = await getUserSettings(auth.user.id);
  return json({ settings });
}

/**
 * POST /api/settings
 * Update user settings
 */
export async function action({ request }: ActionFunctionArgs) {
  const auth = await requireAuth(request);
  const userId = auth.user.id;

  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  switch (intent) {
    case "updateTheme": {
      const theme = formData.get("theme") as Theme;
      if (!["light", "dark", "system"].includes(theme)) {
        return json({ error: "Invalid theme" }, { status: 400 });
      }
      const settings = await updateUserSettings(userId, { theme });
      return json({ settings });
    }

    case "updateDisplay": {
      const compactMode = formData.get("compactMode") === "true";
      const settings = await updateUserSettings(userId, { compactMode });
      return json({ settings });
    }

    case "updateNotifications": {
      const emailNotifications = formData.get("emailNotifications") === "true";
      const notifyReplies = formData.get("notifyReplies") === "true";
      const notifyMentions = formData.get("notifyMentions") === "true";
      const notifyVotes = formData.get("notifyVotes") === "true";
      const notifyCommunityUpdates = formData.get("notifyCommunityUpdates") === "true";

      const settings = await updateUserSettings(userId, {
        emailNotifications,
        notifyReplies,
        notifyMentions,
        notifyVotes,
        notifyCommunityUpdates,
      });
      return json({ settings });
    }

    case "updateFeed": {
      const defaultFeed = formData.get("defaultFeed") as DefaultFeed;
      const defaultSort = formData.get("defaultSort") as DefaultSort;

      const updates: Record<string, string> = {};
      if (defaultFeed && ["all", "subscribed"].includes(defaultFeed)) {
        updates.defaultFeed = defaultFeed;
      }
      if (defaultSort && ["hot", "new", "top", "trending"].includes(defaultSort)) {
        updates.defaultSort = defaultSort;
      }

      const settings = await updateUserSettings(userId, updates as any);
      return json({ settings });
    }

    case "updatePrivacy": {
      const showOnlineStatus = formData.get("showOnlineStatus") === "true";
      const allowDirectMessages = formData.get("allowDirectMessages") === "true";

      const settings = await updateUserSettings(userId, {
        showOnlineStatus,
        allowDirectMessages,
      });
      return json({ settings });
    }

    case "updateAll": {
      // Batch update all settings at once
      const updates: Partial<{
        theme: Theme;
        compactMode: boolean;
        emailNotifications: boolean;
        notifyReplies: boolean;
        notifyMentions: boolean;
        notifyVotes: boolean;
        notifyCommunityUpdates: boolean;
        defaultFeed: DefaultFeed;
        defaultSort: DefaultSort;
        showOnlineStatus: boolean;
        allowDirectMessages: boolean;
      }> = {};

      // Theme
      const theme = formData.get("theme") as Theme;
      if (theme && ["light", "dark", "system"].includes(theme)) {
        updates.theme = theme;
      }

      // Display
      if (formData.has("compactMode")) {
        updates.compactMode = formData.get("compactMode") === "true";
      }

      // Notifications
      if (formData.has("emailNotifications")) {
        updates.emailNotifications = formData.get("emailNotifications") === "true";
      }
      if (formData.has("notifyReplies")) {
        updates.notifyReplies = formData.get("notifyReplies") === "true";
      }
      if (formData.has("notifyMentions")) {
        updates.notifyMentions = formData.get("notifyMentions") === "true";
      }
      if (formData.has("notifyVotes")) {
        updates.notifyVotes = formData.get("notifyVotes") === "true";
      }
      if (formData.has("notifyCommunityUpdates")) {
        updates.notifyCommunityUpdates = formData.get("notifyCommunityUpdates") === "true";
      }

      // Feed
      const defaultFeed = formData.get("defaultFeed") as DefaultFeed;
      if (defaultFeed && ["all", "subscribed"].includes(defaultFeed)) {
        updates.defaultFeed = defaultFeed;
      }
      const defaultSort = formData.get("defaultSort") as DefaultSort;
      if (defaultSort && ["hot", "new", "top", "trending"].includes(defaultSort)) {
        updates.defaultSort = defaultSort;
      }

      // Privacy
      if (formData.has("showOnlineStatus")) {
        updates.showOnlineStatus = formData.get("showOnlineStatus") === "true";
      }
      if (formData.has("allowDirectMessages")) {
        updates.allowDirectMessages = formData.get("allowDirectMessages") === "true";
      }

      const settings = await updateUserSettings(userId, updates);
      return json({ settings });
    }

    default:
      return json({ error: "Invalid action" }, { status: 400 });
  }
}
