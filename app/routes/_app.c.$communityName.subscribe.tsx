import type { ActionFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { requireAuth } from "~/lib/auth/require-auth.server";
import { getCommunity, subscribeToCommunity, unsubscribeFromCommunity } from "~/services/community.server";

export async function action({ request, params }: ActionFunctionArgs) {
  const auth = await requireAuth(request);
  const userId = auth.user?.id;
  const userDid = auth.identity?.providerUserId;

  if (!userId || !userDid) {
    throw new Error("Authentication failed");
  }

  const { communityName } = params;

  if (!communityName) {
    throw new Response("Community not found", { status: 404 });
  }

  // Get community
  const community = await getCommunity(communityName, userDid);

  if (!community) {
    throw new Response("Community not found", { status: 404 });
  }

  try {
    // Toggle subscription
    if (community.isSubscribed) {
      await unsubscribeFromCommunity(userDid, community.id);
    } else {
      await subscribeToCommunity(userDid, community.id);
    }

    // Redirect back to community page
    return redirect(`/c/${communityName}`);
  } catch (error) {
    console.error("Subscription error:", error);
    // Still redirect back, but with error in URL params
    return redirect(`/c/${communityName}?error=subscription_failed`);
  }
}
