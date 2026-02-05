import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { requireAuth } from "~/lib/auth/require-auth.server";
import {
  getUserNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from "~/lib/db/notifications.server";

/**
 * GET /api/notifications
 * Fetch user's notifications
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const auth = await requireAuth(request);
  const userId = auth.user.id;

  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get("limit") || "20");
  const offset = parseInt(url.searchParams.get("offset") || "0");
  const unreadOnly = url.searchParams.get("unreadOnly") === "true";

  const { notifications, unreadCount } = await getUserNotifications(userId, {
    limit,
    offset,
    unreadOnly,
  });

  return json({ notifications, unreadCount });
}

/**
 * POST /api/notifications
 * Actions: markRead, markAllRead, delete
 */
export async function action({ request }: ActionFunctionArgs) {
  const auth = await requireAuth(request);
  const userId = auth.user.id;

  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  switch (intent) {
    case "markRead": {
      const notificationId = formData.get("notificationId") as string;
      if (!notificationId) {
        return json({ error: "Notification ID required" }, { status: 400 });
      }
      const success = await markNotificationAsRead(notificationId, userId);
      return json({ success });
    }

    case "markAllRead": {
      const count = await markAllNotificationsAsRead(userId);
      return json({ success: true, count });
    }

    case "delete": {
      const notificationId = formData.get("notificationId") as string;
      if (!notificationId) {
        return json({ error: "Notification ID required" }, { status: 400 });
      }
      const success = await deleteNotification(notificationId, userId);
      return json({ success });
    }

    default:
      return json({ error: "Invalid action" }, { status: 400 });
  }
}
