import type { ActionFunctionArgs, MetaFunction } from "@remix-run/node";
import { Form, useActionData, useNavigation } from "@remix-run/react";
import { json, redirect } from "@remix-run/node";
import { authenticator } from "~/lib/auth/auth.server";

export const meta: MetaFunction = () => {
  return [
    { title: "Login - MLCommons Community" },
    { name: "description", content: "Sign in with your AT Protocol handle" },
  ];
};

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const handle = formData.get("handle");

  if (!handle || typeof handle !== "string") {
    return json({ error: "Handle is required" }, { status: 400 });
  }

  try {
    // Initialize OAuth flow with ATProto provider
    const { url } = await authenticator.initializeFlow("atproto", handle);

    // Redirect to ATProto OAuth authorization
    return redirect(url);
  } catch (error) {
    console.error("Login error:", error);
    return json(
      { error: error instanceof Error ? error.message : "Failed to initiate login" },
      { status: 500 }
    );
  }
}

export default function Login() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  return (
    <div className="card">
      <h2 className="text-xl font-semibold mb-6">Sign In</h2>

      {actionData?.error && (
        <div className="mb-4 p-3 bg-status-poor bg-opacity-10 border border-status-poor rounded text-status-poor text-sm">
          {actionData.error}
        </div>
      )}

      <Form method="post" className="space-y-4">
        <div>
          <label htmlFor="handle" className="block text-sm font-medium mb-2">
            AT Protocol Handle
          </label>
          <input
            type="text"
            id="handle"
            name="handle"
            placeholder="username.bsky.social"
            className="w-full px-4 py-2 border border-gray-300 rounded focus-ring"
            required
            disabled={isSubmitting}
          />
          <p className="text-xs text-gray mt-1">
            Enter your handle (e.g., alice.bsky.social)
          </p>
        </div>
        <button
          type="submit"
          className="w-full bg-secondary-blue text-white px-6 py-3 rounded font-semibold hover:bg-opacity-90 transition-smooth focus-ring disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Redirecting to OAuth..." : "Continue with OAuth"}
        </button>
      </Form>
      <div className="mt-6 text-center text-sm text-gray">
        <p>
          Don't have an AT Protocol account?{" "}
          <a
            href="https://bsky.app"
            target="_blank"
            rel="noopener noreferrer"
            className="text-secondary-blue hover:text-secondary-teal"
          >
            Create one on Bluesky
          </a>
        </p>
      </div>
    </div>
  );
}
