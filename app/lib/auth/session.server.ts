import { createCookieSessionStorage, redirect } from "@remix-run/node";
import { db } from "../db.server";
import { sessions } from "../../../db/schema";
import { eq } from "drizzle-orm";

// Cookie storage for session ID only (not session data)
const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "__session",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
    sameSite: "lax",
    secrets: [process.env.SESSION_SECRET || "dev-secret-change-in-production"],
    secure: process.env.NODE_ENV === "production",
  },
});

/**
 * Create a new session in the database and return session cookie
 */
export async function createUserSession(
  userId: string,
  identityId: string,
  request: Request,
  redirectTo: string = "/"
) {
  // Generate session ID
  const sessionId = crypto.randomUUID();

  // Extract metadata for security tracking
  const userAgent = request.headers.get("user-agent") || undefined;
  const ipAddress = request.headers.get("x-forwarded-for") ||
                   request.headers.get("x-real-ip") ||
                   undefined;

  // Calculate expiration (7 days from now)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  // Store session in database
  await db.insert(sessions).values({
    id: sessionId,
    userId,
    identityId,
    expiresAt,
    userAgent,
    ipAddress,
  });

  // Create cookie session
  const session = await sessionStorage.getSession();
  session.set("sessionId", sessionId);

  // Redirect with session cookie
  return redirect(redirectTo, {
    headers: {
      "Set-Cookie": await sessionStorage.commitSession(session),
    },
  });
}

/**
 * Get session ID from request cookie
 */
export async function getSessionId(request: Request): Promise<string | null> {
  const cookie = request.headers.get("Cookie");
  const session = await sessionStorage.getSession(cookie);
  const sessionId = session.get("sessionId");
  return sessionId || null;
}

/**
 * Get full session data from database
 */
export async function getSession(request: Request) {
  const sessionId = await getSessionId(request);

  if (!sessionId) {
    return null;
  }

  // Fetch session from database with related data
  const sessionData = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
    with: {
      user: true,
      identity: true,
    },
  });

  // Check if session exists and is not expired
  if (!sessionData || sessionData.expiresAt < new Date()) {
    return null;
  }

  return sessionData;
}

/**
 * Destroy session (logout)
 */
export async function destroySession(request: Request) {
  const sessionId = await getSessionId(request);

  if (sessionId) {
    // Delete from database
    await db.delete(sessions).where(eq(sessions.id, sessionId));
  }

  // Clear cookie
  const session = await sessionStorage.getSession(
    request.headers.get("Cookie")
  );

  return redirect("/", {
    headers: {
      "Set-Cookie": await sessionStorage.destroySession(session),
    },
  });
}

/**
 * Require authenticated user or redirect to login
 */
export async function requireUser(request: Request) {
  const session = await getSession(request);

  if (!session) {
    throw redirect("/auth/login");
  }

  return {
    user: session.user,
    identity: session.identity,
    session: session,
  };
}

export { sessionStorage };
