import type { MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => {
  return [
    { title: "Login - MLCommons Community" },
    { name: "description", content: "Sign in with your AT Protocol handle" },
  ];
};

export default function Login() {
  return (
    <div className="card">
      <h2 className="text-xl font-semibold mb-6">Sign In</h2>
      <form method="post" className="space-y-4">
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
          />
          <p className="text-xs text-gray mt-1">
            Enter your handle (e.g., alice.bsky.social)
          </p>
        </div>
        <button
          type="submit"
          className="w-full bg-secondary-blue text-white px-6 py-3 rounded font-semibold hover:bg-opacity-90 transition-smooth focus-ring"
        >
          Continue with OAuth
        </button>
      </form>
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
