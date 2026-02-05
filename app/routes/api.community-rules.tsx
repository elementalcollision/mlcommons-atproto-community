import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { requireAuth } from "~/lib/auth/require-auth.server";
import {
  getCommunityRules,
  addCommunityRule,
  updateCommunityRule,
  deleteCommunityRule,
  canModerate,
} from "~/lib/db/moderation.server";

/**
 * GET /api/community-rules?communityId=xxx
 * Get rules for a community (public endpoint)
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const communityId = url.searchParams.get("communityId");

  if (!communityId) {
    return json({ error: "Community ID required" }, { status: 400 });
  }

  const rules = await getCommunityRules(communityId);
  return json({ rules });
}

/**
 * POST /api/community-rules
 * Add, update, or delete rules
 */
export async function action({ request }: ActionFunctionArgs) {
  const auth = await requireAuth(request);
  const moderatorDid = auth.user.id;

  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  try {
    switch (intent) {
      case "add": {
        const communityId = formData.get("communityId") as string;
        const title = formData.get("title") as string;
        const description = formData.get("description") as string | null;

        if (!communityId || !title) {
          return json({ error: "Community ID and title required" }, { status: 400 });
        }

        const rule = await addCommunityRule(communityId, moderatorDid, {
          title,
          description: description || undefined,
        });
        return json({ success: true, rule });
      }

      case "update": {
        const ruleId = formData.get("ruleId") as string;
        const title = formData.get("title") as string | null;
        const description = formData.get("description") as string | null;
        const orderIndex = formData.get("orderIndex") as string | null;

        if (!ruleId) {
          return json({ error: "Rule ID required" }, { status: 400 });
        }

        const updates: any = {};
        if (title) updates.title = title;
        if (description !== null) updates.description = description || undefined;
        if (orderIndex) updates.orderIndex = orderIndex;

        const rule = await updateCommunityRule(ruleId, moderatorDid, updates);
        return json({ success: true, rule });
      }

      case "delete": {
        const ruleId = formData.get("ruleId") as string;

        if (!ruleId) {
          return json({ error: "Rule ID required" }, { status: 400 });
        }

        await deleteCommunityRule(ruleId, moderatorDid);
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
