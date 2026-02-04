import { redirect } from "@remix-run/node";
import { getSession } from "./session.server";

/**
 * Require authentication middleware
 * Use in loaders to protect routes
 */
export async function requireAuth(request: Request) {
  const session = await getSession(request);

  if (!session) {
    // Store the intended destination for redirect after login
    const url = new URL(request.url);
    const redirectTo = url.pathname + url.search;

    throw redirect(`/auth/login?redirectTo=${encodeURIComponent(redirectTo)}`);
  }

  return {
    user: session.user,
    identity: session.identity,
    session: session,
  };
}

/**
 * Optional auth - get user if authenticated, null otherwise
 * Use for pages that work with or without authentication
 */
export async function optionalAuth(request: Request) {
  const session = await getSession(request);

  if (!session) {
    return null;
  }

  return {
    user: session.user,
    identity: session.identity,
    session: session,
  };
}
