import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { requireAuth } from "~/lib/auth/require-auth.server";
import {
  removePost,
  restorePost,
  togglePinPost,
  toggleLockPost,
  banUser,
  unbanUser,
  getCommunityBans,
  getModerationLog,
  canModerate,
} from "~/lib/db/moderation.server";

/**
 * GET /api/mod?communityId=xxx&type=bans|log
 * Get moderation data for a community
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const auth = await requireAuth(request);
  const url = new URL(request.url);
  const communityId = url.searchParams.get("communityId");
  const type = url.searchParams.get("type") || "log";

  if (!communityId) {
    return json({ error: "Community ID required" }, { status: 400 });
  }

  // Verify user can moderate
  const hasPermission = await canModerate(communityId, auth.user.id);
  if (!hasPermission) {
    return json({ error: "No permission" }, { status: 403 });
  }

  switch (type) {
    case "bans": {
      const bans = await getCommunityBans(communityId);
      return json({ bans });
    }
    case "log": {
      const limit = parseInt(url.searchParams.get("limit") || "50");
      const offset = parseInt(url.searchParams.get("offset") || "0");
      const { actions, total } = await getModerationLog(communityId, {
        limit,
        offset,
      });
      return json({ actions, total });
    }
    default:
      return json({ error: "Invalid type" }, { status: 400 });
  }
}

/**
 * POST /api/mod
 * Perform moderation actions
 */
export async function action({ request }: ActionFunctionArgs) {
  const auth = await requireAuth(request);
  const moderatorDid = auth.user.id;

  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  try {
    switch (intent) {
      // Post actions - support both long and short form
      case "remove":
      case "removePost": {
        const postUri = formData.get("postUri") as string;
        const reason = (formData.get("reason") as string) || "Removed by moderator";
        if (!postUri) {
          return json({ error: "Post URI required" }, { status: 400 });
        }
        await removePost(postUri, moderatorDid, reason);
        return json({ success: true, message: "Post removed" });
      }

      case "restore":
      case "restorePost": {
        const postUri = formData.get("postUri") as string;
        const reason = formData.get("reason") as string | null;
        if (!postUri) {
          return json({ error: "Post URI required" }, { status: 400 });
        }
        await restorePost(postUri, moderatorDid, reason || undefined);
        return json({ success: true, message: "Post restored" });
      }

      case "pin":
      case "pinPost": {
        const postUri = formData.get("postUri") as string;
        if (!postUri) {
          return json({ error: "Post URI required" }, { status: 400 });
        }
        await togglePinPost(postUri, moderatorDid, true);
        return json({ success: true, message: "Post pinned" });
      }

      case "unpin":
      case "unpinPost": {
        const postUri = formData.get("postUri") as string;
        if (!postUri) {
          return json({ error: "Post URI required" }, { status: 400 });
        }
        await togglePinPost(postUri, moderatorDid, false);
        return json({ success: true, message: "Post unpinned" });
      }

      case "lock":
      case "lockPost": {
        const postUri = formData.get("postUri") as string;
        const reason = formData.get("reason") as string | null;
        if (!postUri) {
          return json({ error: "Post URI required" }, { status: 400 });
        }
        await toggleLockPost(postUri, moderatorDid, true, reason || undefined);
        return json({ success: true, message: "Post locked" });
      }

      case "unlock":
      case "unlockPost": {
        const postUri = formData.get("postUri") as string;
        if (!postUri) {
          return json({ error: "Post URI required" }, { status: 400 });
        }
        await toggleLockPost(postUri, moderatorDid, false);
        return json({ success: true, message: "Post unlocked" });
      }

      // User bans - support both long and short form
      case "ban":
      case "banUser": {
        const communityId = formData.get("communityId") as string;
        // Accept both 'targetUserDid' and 'userDid' for flexibility
        const targetUserDid = (formData.get("targetUserDid") || formData.get("userDid")) as string;
        const reason = (formData.get("reason") as string) || "Banned by moderator";
        // Accept both 'duration' and 'expiresInDays'
        const duration = formData.get("duration") as string | null;
        const expiresInDays = formData.get("expiresInDays") as string | null;
        const finalDuration = duration || (expiresInDays ? `${expiresInDays}d` : null);

        if (!communityId || !targetUserDid) {
          return json(
            { error: "Community ID and target user required" },
            { status: 400 }
          );
        }

        await banUser(
          communityId,
          targetUserDid,
          moderatorDid,
          reason,
          finalDuration || undefined
        );
        return json({ success: true, message: "User banned" });
      }

      case "unban":
      case "unbanUser": {
        const communityId = formData.get("communityId") as string;
        const targetUserDid = formData.get("targetUserDid") as string;
        const reason = formData.get("reason") as string | null;

        if (!communityId || !targetUserDid) {
          return json(
            { error: "Community ID and target user required" },
            { status: 400 }
          );
        }

        await unbanUser(communityId, targetUserDid, moderatorDid, reason || undefined);
        return json({ success: true, message: "User unbanned" });
      }

      default:
        return json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return json({ error: message }, { status: 400 });
  }
}
