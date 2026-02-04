import type { LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { authenticator } from "~/lib/auth/auth.server";
import { getUserOrCreate } from "~/lib/auth/user-linking.server";
import { createUserSession } from "~/lib/auth/session.server";

export async function loader({ params, request }: LoaderFunctionArgs) {
  const provider = params.provider;

  if (!provider) {
    throw new Response("Provider not specified", { status: 400 });
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  // Handle OAuth errors
  if (error) {
    console.error(`OAuth error from ${provider}:`, error, errorDescription);
    return redirect(`/auth/login?error=${encodeURIComponent(errorDescription || error)}`);
  }

  if (!code) {
    throw new Response("Missing authorization code", { status: 400 });
  }

  try {
    // Authenticate with provider
    const providerUser = await authenticator.authenticate(provider, {
      code,
      state: state || undefined,
    });

    // Get or create user and link identity
    const { user, identity } = await getUserOrCreate(provider, providerUser);

    // Create session and redirect to home
    return createUserSession(user.id, identity.id, request, "/home");
  } catch (error) {
    console.error(`${provider} authentication error:`, error);

    const errorMessage = error instanceof Error
      ? error.message
      : "Authentication failed";

    return redirect(`/auth/login?error=${encodeURIComponent(errorMessage)}`);
  }
}

// Show loading message while processing callback
export default function AuthCallback() {
  return (
    <div className="card text-center">
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-secondary-blue mb-4"></div>
        <h2 className="text-xl font-semibold mb-2">Completing sign in...</h2>
        <p className="text-gray">Please wait while we authenticate you.</p>
      </div>
    </div>
  );
}
