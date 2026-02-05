import type { LoaderFunctionArgs, ActionFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useFetcher, Form } from "@remix-run/react";
import { requireAuth } from "~/lib/auth/require-auth.server";
import { getUserSettings, updateUserSettings } from "~/lib/db/user-settings.server";
import { useState, useEffect } from "react";
import { useTheme, type Theme } from "~/components/ThemeProvider";

export const meta: MetaFunction = () => {
  return [
    { title: "Settings - MLCommons Community" },
    { name: "description", content: "Manage your account settings" },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const auth = await requireAuth(request);
  const settings = await getUserSettings(auth.user.id);
  return json({ settings });
}

export async function action({ request }: ActionFunctionArgs) {
  const auth = await requireAuth(request);
  const userId = auth.user.id;

  const formData = await request.formData();
  const section = formData.get("section") as string;

  const updates: Record<string, any> = {};

  switch (section) {
    case "appearance":
      updates.theme = formData.get("theme") as string;
      updates.compactMode = formData.get("compactMode") === "on";
      break;

    case "notifications":
      updates.emailNotifications = formData.get("emailNotifications") === "on";
      updates.notifyReplies = formData.get("notifyReplies") === "on";
      updates.notifyMentions = formData.get("notifyMentions") === "on";
      updates.notifyVotes = formData.get("notifyVotes") === "on";
      updates.notifyCommunityUpdates = formData.get("notifyCommunityUpdates") === "on";
      break;

    case "feed":
      updates.defaultFeed = formData.get("defaultFeed") as string;
      updates.defaultSort = formData.get("defaultSort") as string;
      break;

    case "privacy":
      updates.showOnlineStatus = formData.get("showOnlineStatus") === "on";
      updates.allowDirectMessages = formData.get("allowDirectMessages") === "on";
      break;

    default:
      return json({ error: "Invalid section" }, { status: 400 });
  }

  const settings = await updateUserSettings(userId, updates);
  return json({ settings, success: true, section });
}

export default function SettingsPage() {
  const { settings } = useLoaderData<typeof loader>();
  const { theme: currentTheme, setTheme } = useTheme();

  // Sync local theme with server settings on mount
  useEffect(() => {
    if (settings.theme && settings.theme !== currentTheme) {
      setTheme(settings.theme as Theme);
    }
  }, []);

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme); // Update local theme immediately
  };

  return (
    <div className="container-custom max-w-3xl">
      <h1 className="text-2xl font-serif font-bold mb-6 dark:text-white">Settings</h1>

      <div className="space-y-6">
        {/* Appearance */}
        <SettingsSection
          title="Appearance"
          description="Customize how MLCommons looks"
          section="appearance"
          settings={settings}
          onThemeChange={handleThemeChange}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 dark:text-gray-200">Theme</label>
              <div className="flex gap-4">
                {[
                  { value: "system", label: "System", icon: "💻" },
                  { value: "light", label: "Light", icon: "☀️" },
                  { value: "dark", label: "Dark", icon: "🌙" },
                ].map(({ value, label, icon }) => (
                  <label
                    key={value}
                    className={`flex-1 flex items-center justify-center gap-2 p-3 border rounded-lg cursor-pointer transition-smooth ${
                      currentTheme === value
                        ? "border-secondary-blue bg-blue-50 dark:bg-blue-900/30"
                        : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                    }`}
                  >
                    <input
                      type="radio"
                      name="theme"
                      value={value}
                      checked={currentTheme === value}
                      onChange={() => handleThemeChange(value as Theme)}
                      className="sr-only"
                    />
                    <span>{icon}</span>
                    <span className="font-medium dark:text-white">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium dark:text-white">Compact Mode</label>
                <p className="text-sm text-gray dark:text-gray-400">Show more posts on screen</p>
              </div>
              <Toggle name="compactMode" defaultChecked={settings.compactMode} />
            </div>
          </div>
        </SettingsSection>

        {/* Notifications */}
        <SettingsSection
          title="Notifications"
          description="Choose what notifications you receive"
          section="notifications"
          settings={settings}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium dark:text-white">Email Notifications</label>
                <p className="text-sm text-gray dark:text-gray-400">Receive notifications via email</p>
              </div>
              <Toggle name="emailNotifications" defaultChecked={settings.emailNotifications} />
            </div>

            <hr className="border-gray-200 dark:border-gray-700" />

            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium dark:text-white">Replies</label>
                <p className="text-sm text-gray dark:text-gray-400">When someone replies to your post</p>
              </div>
              <Toggle name="notifyReplies" defaultChecked={settings.notifyReplies} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium dark:text-white">Mentions</label>
                <p className="text-sm text-gray dark:text-gray-400">When someone mentions you</p>
              </div>
              <Toggle name="notifyMentions" defaultChecked={settings.notifyMentions} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium dark:text-white">Votes</label>
                <p className="text-sm text-gray dark:text-gray-400">When your posts reach vote milestones</p>
              </div>
              <Toggle name="notifyVotes" defaultChecked={settings.notifyVotes} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium dark:text-white">Community Updates</label>
                <p className="text-sm text-gray dark:text-gray-400">News from communities you've joined</p>
              </div>
              <Toggle name="notifyCommunityUpdates" defaultChecked={settings.notifyCommunityUpdates} />
            </div>
          </div>
        </SettingsSection>

        {/* Feed Preferences */}
        <SettingsSection
          title="Feed Preferences"
          description="Customize your default feed experience"
          section="feed"
          settings={settings}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 dark:text-white">Default Feed</label>
              <select
                name="defaultFeed"
                defaultValue={settings.defaultFeed}
                className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary-blue bg-white dark:bg-gray-700 dark:text-white"
              >
                <option value="all">All Posts</option>
                <option value="subscribed">Subscribed Communities Only</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 dark:text-white">Default Sort</label>
              <select
                name="defaultSort"
                defaultValue={settings.defaultSort}
                className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary-blue bg-white dark:bg-gray-700 dark:text-white"
              >
                <option value="hot">Hot</option>
                <option value="new">New</option>
                <option value="top">Top</option>
                <option value="trending">Trending</option>
              </select>
            </div>
          </div>
        </SettingsSection>

        {/* Privacy */}
        <SettingsSection
          title="Privacy"
          description="Control your privacy settings"
          section="privacy"
          settings={settings}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium dark:text-white">Show Online Status</label>
                <p className="text-sm text-gray dark:text-gray-400">Let others see when you're online</p>
              </div>
              <Toggle name="showOnlineStatus" defaultChecked={settings.showOnlineStatus} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium dark:text-white">Allow Direct Messages</label>
                <p className="text-sm text-gray dark:text-gray-400">Receive DMs from other users</p>
              </div>
              <Toggle name="allowDirectMessages" defaultChecked={settings.allowDirectMessages} />
            </div>
          </div>
        </SettingsSection>
      </div>
    </div>
  );
}

function SettingsSection({
  title,
  description,
  section,
  settings,
  onThemeChange,
  children,
}: {
  title: string;
  description: string;
  section: string;
  settings: any;
  onThemeChange?: (theme: Theme) => void;
  children: React.ReactNode;
}) {
  const fetcher = useFetcher();
  const [savedMessage, setSavedMessage] = useState(false);

  useEffect(() => {
    if (fetcher.data?.success && fetcher.data?.section === section) {
      setSavedMessage(true);
      const timer = setTimeout(() => setSavedMessage(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [fetcher.data, section]);

  // Handle form submission with theme sync
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (section === "appearance" && onThemeChange) {
      const formData = new FormData(e.currentTarget);
      const theme = formData.get("theme") as Theme;
      if (theme) {
        onThemeChange(theme);
      }
    }
  };

  return (
    <fetcher.Form method="post" className="card" onSubmit={handleSubmit}>
      <input type="hidden" name="section" value={section} />
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-lg font-serif font-bold dark:text-white">{title}</h2>
          <p className="text-sm text-gray dark:text-gray-400">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          {savedMessage && (
            <span className="text-sm text-green-600 dark:text-green-400 animate-fade-in">Saved!</span>
          )}
          <button
            type="submit"
            disabled={fetcher.state !== "idle"}
            className="px-4 py-2 bg-secondary-blue text-white rounded-lg font-medium hover:bg-opacity-90 transition-smooth disabled:opacity-50"
          >
            {fetcher.state !== "idle" ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
      {children}
    </fetcher.Form>
  );
}

function Toggle({
  name,
  defaultChecked,
}: {
  name: string;
  defaultChecked: boolean;
}) {
  const [checked, setChecked] = useState(defaultChecked);

  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={(e) => setChecked(e.target.checked)}
        className="sr-only peer"
      />
      <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-secondary-blue rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 dark:after:border-gray-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary-blue"></div>
    </label>
  );
}
