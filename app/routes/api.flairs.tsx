import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { requireAuth } from "~/lib/auth/require-auth.server";
import {
  getCommunityFlairs,
  addPostFlair,
  deletePostFlair,
  setPostFlair,
  canModerate,
} from "~/lib/db/moderation.server";

/**
 * GET /api/flairs?communityId=xxx
 * Get flairs for a community (public endpoint)
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const communityId = url.searchParams.get("communityId");

  if (!communityId) {
    return json({ error: "Community ID required" }, { status: 400 });
  }

  const flairs = await getCommunityFlairs(communityId);
  return json({ flairs });
}

/**
 * POST /api/flairs
 * Add, delete flairs, or set flair on a post
 */
export async function action({ request }: ActionFunctionArgs) {
  const auth = await requireAuth(request);
  const userDid = auth.user.id;

  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  try {
    switch (intent) {
      case "add": {
        const communityId = formData.get("communityId") as string;
        const name = formData.get("name") as string;
        const color = formData.get("color") as string | null;
        const backgroundColor = formData.get("backgroundColor") as string | null;
        const isModOnly = formData.get("isModOnly") === "true";

        if (!communityId || !name) {
          return json({ error: "Community ID and name required" }, { status: 400 });
        }

        const flair = await addPostFlair(communityId, userDid, {
          name,
          color: color || undefined,
          backgroundColor: backgroundColor || undefined,
          isModOnly,
        });
        return json({ success: true, flair });
      }

      case "delete": {
        const flairId = formData.get("flairId") as string;

        if (!flairId) {
          return json({ error: "Flair ID required" }, { status: 400 });
        }

        await deletePostFlair(flairId, userDid);
        return json({ success: true });
      }

      case "setPostFlair": {
        const postUri = formData.get("postUri") as string;
        const flairId = formData.get("flairId") as string | null;

        if (!postUri) {
          return json({ error: "Post URI required" }, { status: 400 });
        }

        await setPostFlair(postUri, flairId, userDid);
        return json({ success: true });
      }

      default:
        return json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return json({ error: message }, { status: 400 });
  }
}
