import type { LoaderFunctionArgs, ActionFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useFetcher, Link } from "@remix-run/react";
import { formatDistanceToNow } from "date-fns";
import { requireAuth } from "~/lib/auth/require-auth.server";
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from "~/lib/db/notifications.server";

export const meta: MetaFunction = () => {
  return [
    { title: "Notifications - MLCommons Community" },
    { name: "description", content: "Your notifications" },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const auth = await requireAuth(request);
  const { notifications, unreadCount } = await getUserNotifications(
    auth.user.id,
    { limit: 50 }
  );

  return json({ notifications, unreadCount });
}

export async function action({ request }: ActionFunctionArgs) {
  const auth = await requireAuth(request);
  const userId = auth.user.id;

  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  switch (intent) {
    case "markRead": {
      const notificationId = formData.get("notificationId") as string;
      await markNotificationAsRead(notificationId, userId);
      return json({ success: true });
    }

    case "markAllRead": {
      await markAllNotificationsAsRead(userId);
      return json({ success: true });
    }

    case "delete": {
      const notificationId = formData.get("notificationId") as string;
      await deleteNotification(notificationId, userId);
      return json({ success: true });
    }

    default:
      return json({ error: "Invalid action" }, { status: 400 });
  }
}

export default function NotificationsPage() {
  const { notifications, unreadCount } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  const handleMarkAllRead = () => {
    fetcher.submit({ intent: "markAllRead" }, { method: "post" });
  };

  return (
    <div className="container-custom max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-serif font-bold">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-gray text-sm">
              {unreadCount} unread notification{unreadCount === 1 ? "" : "s"}
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            disabled={fetcher.state !== "idle"}
            className="text-sm text-secondary-blue hover:underline disabled:opacity-50"
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* Notification List */}
      {notifications.length === 0 ? (
        <div className="card text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
          </div>
          <h3 className="text-xl font-serif font-bold mb-2">No notifications yet</h3>
          <p className="text-gray mb-6">
            When someone replies to your posts or mentions you, you'll see it here.
          </p>
          <Link
            to="/home"
            className="inline-block bg-primary text-dark px-6 py-3 rounded-lg font-semibold hover:bg-primary-dark transition-smooth"
          >
            Explore Posts
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function NotificationItem({
  notification,
}: {
  notification: {
    id: string;
    type: string;
    title: string;
    body: string | null;
    link: string | null;
    isRead: boolean;
    createdAt: string;
  };
}) {
  const fetcher = useFetcher();

  const handleMarkRead = () => {
    if (!notification.isRead) {
      fetcher.submit(
        { intent: "markRead", notificationId: notification.id },
        { method: "post" }
      );
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    fetcher.submit(
      { intent: "delete", notificationId: notification.id },
      { method: "post" }
    );
  };

  const icon = getNotificationIcon(notification.type);
  const isDeleting = fetcher.formData?.get("intent") === "delete";

  const content = (
    <div
      className={`card flex gap-4 transition-smooth hover:shadow-md ${
        notification.isRead ? "bg-white" : "bg-blue-50 border-l-4 border-l-secondary-blue"
      } ${isDeleting ? "opacity-50" : ""}`}
      onClick={handleMarkRead}
    >
      {/* Icon */}
      <div
        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
          notification.isRead ? "bg-gray-100" : "bg-secondary-blue text-white"
        }`}
      >
        {icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${notification.isRead ? "text-gray" : "text-dark font-medium"}`}>
          {notification.title}
        </p>
        {notification.body && (
          <p className="text-sm text-gray mt-1 line-clamp-2">{notification.body}</p>
        )}
        <p className="text-xs text-gray-400 mt-1">
          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
        </p>
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 flex items-center gap-2">
        {!notification.isRead && (
          <span className="w-2 h-2 bg-secondary-blue rounded-full" />
        )}
        <button
          onClick={handleDelete}
          className="p-1 text-gray-400 hover:text-red-500 transition-smooth"
          title="Delete notification"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );

  // Wrap in link if available
  if (notification.link) {
    return (
      <Link to={notification.link} className="block no-underline" onClick={handleMarkRead}>
        {content}
      </Link>
    );
  }

  return content;
}

function getNotificationIcon(type: string) {
  switch (type) {
    case "reply":
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
          />
        </svg>
      );
    case "mention":
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
          />
        </svg>
      );
    case "vote":
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 15l7-7 7 7"
          />
        </svg>
      );
    case "community":
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      );
    case "moderator":
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
      );
    default:
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
      );
  }
}
