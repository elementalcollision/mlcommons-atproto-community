import type { LoaderFunctionArgs, ActionFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useFetcher, Link } from "@remix-run/react";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { requireAuth } from "~/lib/auth/require-auth.server";
import { findCommunityByName } from "~/lib/db/communities.server";
import {
  canModerate,
  isOwner,
  getCommunityBans,
  getCommunityRules,
  getCommunityFlairs,
  getModerationLog,
  getCommunityModerators,
} from "~/lib/db/moderation.server";
import type { CommunityBan, CommunityRule, PostFlair, ModerationAction } from "../../../db/schema";

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [
    { title: data?.community ? `Moderation - c/${data.community.name}` : "Moderation" },
    { name: "description", content: "Community moderation dashboard" },
  ];
};

export async function loader({ params, request }: LoaderFunctionArgs) {
  const auth = await requireAuth(request);
  const { communityName } = params;

  if (!communityName) {
    throw new Response("Community not found", { status: 404 });
  }

  const community = await findCommunityByName(communityName);
  if (!community) {
    throw new Response("Community not found", { status: 404 });
  }

  // Check if user can moderate
  const hasPermission = await canModerate(community.id, auth.user.id);
  if (!hasPermission) {
    return redirect(`/c/${communityName}`);
  }

  const userIsOwner = await isOwner(community.id, auth.user.id);

  // Fetch all moderation data
  const [bans, rules, flairs, { actions, total }, moderators] = await Promise.all([
    getCommunityBans(community.id),
    getCommunityRules(community.id),
    getCommunityFlairs(community.id),
    getModerationLog(community.id, { limit: 20 }),
    getCommunityModerators(community.id),
  ]);

  return json({
    community,
    bans,
    rules,
    flairs,
    actions,
    totalActions: total,
    moderators,
    userIsOwner,
  });
}

export default function CommunityModeration() {
  const {
    community,
    bans,
    rules,
    flairs,
    actions,
    totalActions,
    moderators,
    userIsOwner,
  } = useLoaderData<typeof loader>();

  const [activeTab, setActiveTab] = useState<"log" | "bans" | "rules" | "flairs" | "moderators">("log");

  return (
    <div className="container-custom max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Link
            to={`/c/${community.name}`}
            className="text-secondary-blue hover:underline no-underline"
          >
            c/{community.name}
          </Link>
          <span className="text-gray">/</span>
          <span className="text-gray">Moderation</span>
        </div>
        <h1 className="text-2xl font-serif font-bold dark:text-white">Moderation Dashboard</h1>
        <p className="text-gray dark:text-gray-400">
          Manage rules, bans, flairs, and view moderation history
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 mb-6 overflow-x-auto">
        {[
          { id: "log", label: "Activity Log", count: totalActions },
          { id: "bans", label: "Bans", count: bans.length },
          { id: "rules", label: "Rules", count: rules.length },
          { id: "flairs", label: "Flairs", count: flairs.length },
          { id: "moderators", label: "Moderators", count: moderators.length + 1 },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-3 font-medium whitespace-nowrap transition-colors border-b-2 ${
              activeTab === tab.id
                ? "border-secondary-blue text-secondary-blue"
                : "border-transparent text-gray hover:text-dark dark:hover:text-white"
            }`}
          >
            {tab.label}
            <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "log" && (
        <ModerationLogTab actions={actions} />
      )}
      {activeTab === "bans" && (
        <BansTab bans={bans} communityId={community.id} />
      )}
      {activeTab === "rules" && (
        <RulesTab rules={rules} communityId={community.id} />
      )}
      {activeTab === "flairs" && (
        <FlairsTab flairs={flairs} communityId={community.id} />
      )}
      {activeTab === "moderators" && (
        <ModeratorsTab
          moderators={moderators}
          communityId={community.id}
          creatorDid={community.creatorDid}
          userIsOwner={userIsOwner}
        />
      )}
    </div>
  );
}

// ============================================
// Activity Log Tab
// ============================================

function ModerationLogTab({ actions }: { actions: ModerationAction[] }) {
  if (actions.length === 0) {
    return (
      <div className="card text-center py-12">
        <p className="text-gray dark:text-gray-400">No moderation actions yet</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="text-lg font-serif font-bold mb-4 dark:text-white">Recent Activity</h2>
      <div className="space-y-4">
        {actions.map((action) => (
          <div
            key={action.id}
            className="flex items-start gap-3 pb-4 border-b border-gray-100 dark:border-gray-700 last:border-0"
          >
            <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
              {getActionIcon(action.action)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm dark:text-gray-200">
                <span className="font-medium">{getActionLabel(action.action)}</span>
                {action.reason && (
                  <span className="text-gray dark:text-gray-400"> - {action.reason}</span>
                )}
              </p>
              <p className="text-xs text-gray dark:text-gray-500">
                {formatDistanceToNow(new Date(action.createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getActionIcon(action: string) {
  switch (action) {
    case "remove_post":
    case "restore_post":
      return <span className="text-red-500">📝</span>;
    case "ban_user":
    case "unban_user":
      return <span className="text-orange-500">🚫</span>;
    case "pin_post":
    case "unpin_post":
      return <span className="text-blue-500">📌</span>;
    case "lock_post":
    case "unlock_post":
      return <span className="text-yellow-500">🔒</span>;
    case "add_moderator":
    case "remove_moderator":
      return <span className="text-green-500">👤</span>;
    default:
      return <span>⚙️</span>;
  }
}

function getActionLabel(action: string) {
  const labels: Record<string, string> = {
    remove_post: "Post removed",
    restore_post: "Post restored",
    pin_post: "Post pinned",
    unpin_post: "Post unpinned",
    lock_post: "Post locked",
    unlock_post: "Post unlocked",
    ban_user: "User banned",
    unban_user: "User unbanned",
    mute_user: "User muted",
    unmute_user: "User unmuted",
    update_rules: "Rules updated",
    add_flair: "Flair added",
    remove_flair: "Flair removed",
    add_moderator: "Moderator added",
    remove_moderator: "Moderator removed",
  };
  return labels[action] || action;
}

// ============================================
// Bans Tab
// ============================================

function BansTab({
  bans,
  communityId,
}: {
  bans: CommunityBan[];
  communityId: string;
}) {
  const fetcher = useFetcher();

  const handleUnban = (userDid: string) => {
    if (confirm("Are you sure you want to unban this user?")) {
      fetcher.submit(
        { intent: "unbanUser", communityId, targetUserDid: userDid },
        { method: "post", action: "/api/mod" }
      );
    }
  };

  if (bans.length === 0) {
    return (
      <div className="card text-center py-12">
        <p className="text-gray dark:text-gray-400">No banned users</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="text-lg font-serif font-bold mb-4 dark:text-white">Banned Users</h2>
      <div className="space-y-3">
        {bans.map((ban) => (
          <div
            key={ban.id}
            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
          >
            <div>
              <p className="font-medium dark:text-white text-sm truncate max-w-xs">
                {ban.userDid}
              </p>
              <p className="text-xs text-gray dark:text-gray-400">
                {ban.isPermanent
                  ? "Permanent ban"
                  : `Expires ${ban.expiresAt ? formatDistanceToNow(new Date(ban.expiresAt), { addSuffix: true }) : "never"}`}
              </p>
              <p className="text-xs text-gray dark:text-gray-400">Reason: {ban.reason}</p>
            </div>
            <button
              onClick={() => handleUnban(ban.userDid)}
              disabled={fetcher.state !== "idle"}
              className="px-3 py-1 text-sm bg-secondary-blue text-white rounded hover:bg-opacity-90 disabled:opacity-50"
            >
              Unban
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// Rules Tab
// ============================================

function RulesTab({
  rules,
  communityId,
}: {
  rules: CommunityRule[];
  communityId: string;
}) {
  const fetcher = useFetcher();
  const [showAddForm, setShowAddForm] = useState(false);

  const handleDelete = (ruleId: string) => {
    if (confirm("Are you sure you want to delete this rule?")) {
      fetcher.submit(
        { intent: "delete", ruleId },
        { method: "post", action: "/api/community-rules" }
      );
    }
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-serif font-bold dark:text-white">Community Rules</h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-3 py-1 text-sm bg-secondary-blue text-white rounded hover:bg-opacity-90"
        >
          {showAddForm ? "Cancel" : "Add Rule"}
        </button>
      </div>

      {showAddForm && (
        <fetcher.Form
          method="post"
          action="/api/community-rules"
          className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
          onSubmit={() => setShowAddForm(false)}
        >
          <input type="hidden" name="intent" value="add" />
          <input type="hidden" name="communityId" value={communityId} />
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-white">Title</label>
              <input
                type="text"
                name="title"
                required
                className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
                placeholder="e.g., Be respectful"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-white">
                Description (optional)
              </label>
              <textarea
                name="description"
                rows={2}
                className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
                placeholder="Explain the rule in more detail..."
              />
            </div>
            <button
              type="submit"
              disabled={fetcher.state !== "idle"}
              className="px-4 py-2 bg-secondary-blue text-white rounded-lg font-medium hover:bg-opacity-90 disabled:opacity-50"
            >
              Add Rule
            </button>
          </div>
        </fetcher.Form>
      )}

      {rules.length === 0 ? (
        <p className="text-gray dark:text-gray-400 text-center py-8">
          No rules yet. Add some to help guide your community.
        </p>
      ) : (
        <div className="space-y-3">
          {rules.map((rule, index) => (
            <div
              key={rule.id}
              className="flex items-start justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
            >
              <div className="flex gap-3">
                <span className="w-6 h-6 flex items-center justify-center bg-secondary-blue text-white text-sm rounded-full font-medium">
                  {index + 1}
                </span>
                <div>
                  <p className="font-medium dark:text-white">{rule.title}</p>
                  {rule.description && (
                    <p className="text-sm text-gray dark:text-gray-400">{rule.description}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleDelete(rule.id)}
                className="p-1 text-gray-400 hover:text-red-500"
                title="Delete rule"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// Flairs Tab
// ============================================

function FlairsTab({
  flairs,
  communityId,
}: {
  flairs: PostFlair[];
  communityId: string;
}) {
  const fetcher = useFetcher();
  const [showAddForm, setShowAddForm] = useState(false);

  const handleDelete = (flairId: string) => {
    if (confirm("Are you sure you want to delete this flair?")) {
      fetcher.submit(
        { intent: "delete", flairId },
        { method: "post", action: "/api/flairs" }
      );
    }
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-serif font-bold dark:text-white">Post Flairs</h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-3 py-1 text-sm bg-secondary-blue text-white rounded hover:bg-opacity-90"
        >
          {showAddForm ? "Cancel" : "Add Flair"}
        </button>
      </div>

      {showAddForm && (
        <fetcher.Form
          method="post"
          action="/api/flairs"
          className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
          onSubmit={() => setShowAddForm(false)}
        >
          <input type="hidden" name="intent" value="add" />
          <input type="hidden" name="communityId" value={communityId} />
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-white">Name</label>
              <input
                type="text"
                name="name"
                required
                className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
                placeholder="e.g., Discussion"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-white">
                  Text Color
                </label>
                <input
                  type="color"
                  name="color"
                  defaultValue="#034EA2"
                  className="w-full h-10 rounded cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-white">
                  Background Color
                </label>
                <input
                  type="color"
                  name="backgroundColor"
                  defaultValue="#E3F2FD"
                  className="w-full h-10 rounded cursor-pointer"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm dark:text-white">
              <input type="checkbox" name="isModOnly" value="true" />
              <span>Moderators only can apply this flair</span>
            </label>
            <button
              type="submit"
              disabled={fetcher.state !== "idle"}
              className="px-4 py-2 bg-secondary-blue text-white rounded-lg font-medium hover:bg-opacity-90 disabled:opacity-50"
            >
              Add Flair
            </button>
          </div>
        </fetcher.Form>
      )}

      {flairs.length === 0 ? (
        <p className="text-gray dark:text-gray-400 text-center py-8">
          No flairs yet. Add some to help categorize posts.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {flairs.map((flair) => (
            <div
              key={flair.id}
              className="flex items-center gap-2 px-3 py-1 rounded-full"
              style={{
                backgroundColor: flair.backgroundColor || "#E3F2FD",
                color: flair.color || "#034EA2",
              }}
            >
              <span className="text-sm font-medium">{flair.name}</span>
              {flair.isModOnly && <span className="text-xs opacity-75">🔒</span>}
              <button
                onClick={() => handleDelete(flair.id)}
                className="hover:opacity-75"
                title="Delete flair"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// Moderators Tab
// ============================================

function ModeratorsTab({
  moderators,
  communityId,
  creatorDid,
  userIsOwner,
}: {
  moderators: Array<{ id: string; userDid: string; role: string; createdAt: Date }>;
  communityId: string;
  creatorDid: string;
  userIsOwner: boolean;
}) {
  const fetcher = useFetcher();

  return (
    <div className="card">
      <h2 className="text-lg font-serif font-bold mb-4 dark:text-white">Moderators</h2>
      <div className="space-y-3">
        {/* Owner */}
        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-dark" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="font-medium dark:text-white text-sm truncate max-w-xs">
                {creatorDid}
              </p>
              <p className="text-xs text-primary font-semibold">Owner</p>
            </div>
          </div>
        </div>

        {/* Moderators */}
        {moderators.map((mod) => (
          <div
            key={mod.id}
            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-secondary-blue bg-opacity-20 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-secondary-blue" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="font-medium dark:text-white text-sm truncate max-w-xs">
                  {mod.userDid}
                </p>
                <p className="text-xs text-secondary-blue capitalize">{mod.role}</p>
              </div>
            </div>
            {userIsOwner && (
              <button
                onClick={() => {
                  if (confirm("Remove this moderator?")) {
                    // Would need to add remove moderator API
                  }
                }}
                className="p-1 text-gray-400 hover:text-red-500"
                title="Remove moderator"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>

      {userIsOwner && (
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <p className="text-sm text-gray dark:text-gray-400 mb-2">
            To add a moderator, enter their Bluesky DID:
          </p>
          <fetcher.Form method="post" action="/api/moderators" className="flex gap-2">
            <input type="hidden" name="intent" value="add" />
            <input type="hidden" name="communityId" value={communityId} />
            <input
              type="text"
              name="targetUserDid"
              placeholder="did:plc:..."
              className="flex-1 p-2 border border-gray-200 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white text-sm"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-secondary-blue text-white rounded-lg font-medium text-sm hover:bg-opacity-90"
            >
              Add
            </button>
          </fetcher.Form>
        </div>
      )}
    </div>
  );
}
