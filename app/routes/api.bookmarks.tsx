import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { requireAuth } from "~/lib/auth/require-auth.server";
import {
  getUserBookmarks,
  toggleBookmark,
  isPostBookmarked,
} from "~/lib/db/bookmarks.server";

/**
 * GET /api/bookmarks
 * Fetch user's bookmarked posts
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const auth = await requireAuth(request);
  const userId = auth.user.id;

  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get("limit") || "20");
  const offset = parseInt(url.searchParams.get("offset") || "0");
  const postUri = url.searchParams.get("postUri");

  // If checking specific post
  if (postUri) {
    const bookmarked = await isPostBookmarked(userId, postUri);
    return json({ bookmarked });
  }

  // Otherwise return all bookmarks
  const { bookmarks, total } = await getUserBookmarks(userId, {
    limit,
    offset,
  });

  return json({ bookmarks, total });
}

/**
 * POST /api/bookmarks
 * Toggle bookmark on a post
 */
export async function action({ request }: ActionFunctionArgs) {
  const auth = await requireAuth(request);
  const userId = auth.user.id;

  const formData = await request.formData();
  const postUri = formData.get("postUri") as string;

  if (!postUri) {
    return json({ error: "Post URI required" }, { status: 400 });
  }

  const result = await toggleBookmark(userId, postUri);

  return json(result);
}
