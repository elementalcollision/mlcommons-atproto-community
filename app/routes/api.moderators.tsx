import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { requireAuth } from "~/lib/auth/require-auth.server";
import {
  addModerator,
  removeModerator,
  getCommunityModerators,
  isOwner,
} from "~/lib/db/moderation.server";

/**
 * GET /api/moderators?communityId=xxx
 * Get moderators for a community
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const communityId = url.searchParams.get("communityId");

  if (!communityId) {
    return json({ error: "Community ID required" }, { status: 400 });
  }

  const moderators = await getCommunityModerators(communityId);
  return json({ moderators });
}

/**
 * POST /api/moderators
 * Add or remove moderators (owner only)
 */
export async function action({ request }: ActionFunctionArgs) {
  const auth = await requireAuth(request);
  const userDid = auth.user.id;

  const formData = await request.formData();
  const intent = formData.get("intent") as string;
  const communityId = formData.get("communityId") as string;

  if (!communityId) {
    return json({ error: "Community ID required" }, { status: 400 });
  }

  // Verify user is owner
  const userIsOwner = await isOwner(communityId, userDid);
  if (!userIsOwner) {
    return json({ error: "Only the owner can manage moderators" }, { status: 403 });
  }

  try {
    switch (intent) {
      case "add": {
        const targetUserDid = formData.get("targetUserDid") as string;
        const role = (formData.get("role") as "moderator" | "admin") || "moderator";

        if (!targetUserDid) {
          return json({ error: "Target user DID required" }, { status: 400 });
        }

        await addModerator(communityId, targetUserDid, userDid, role);
        return json({ success: true, message: "Moderator added" });
      }

      case "remove": {
        const targetUserDid = formData.get("targetUserDid") as string;

        if (!targetUserDid) {
          return json({ error: "Target user DID required" }, { status: 400 });
        }

        await removeModerator(communityId, targetUserDid, userDid);
        return json({ success: true, message: "Moderator removed" });
      }

      default:
        return json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return json({ error: message }, { status: 400 });
  }
}
