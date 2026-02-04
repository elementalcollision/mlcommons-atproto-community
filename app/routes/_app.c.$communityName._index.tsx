import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { optionalAuth } from "~/lib/auth/require-auth.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { communityName } = params;

  // Get optional auth
  const auth = await optionalAuth(request);

  // TODO: Fetch posts for this community (Phase 4)
  const posts: any[] = [];

  return json({ communityName, posts, isAuthenticated: !!auth });
}

export default function CommunityPosts() {
  const { communityName, posts, isAuthenticated } = useLoaderData<typeof loader>();

  return (
    <div className="max-w-3xl mx-auto">
      {/* Post Creation Section */}
      {isAuthenticated && (
        <div className="card mb-6">
          <Link
            to={`/c/${communityName}/submit`}
            className="block w-full p-4 text-left text-gray hover:bg-gray-50 rounded-lg transition-smooth border border-gray-200"
          >
            Create a post in this community...
          </Link>
        </div>
      )}

      {/* Posts Feed */}
      {posts.length === 0 ? (
        <div className="card text-center py-12">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 bg-primary rounded-full mx-auto mb-4 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-dark"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-serif font-bold mb-2">
              No posts yet
            </h3>
            <p className="text-gray mb-6">
              Be the first to start a conversation in this community!
            </p>
            {isAuthenticated && (
              <Link
                to={`/c/${communityName}/submit`}
                className="inline-block bg-primary text-dark px-6 py-3 rounded-lg font-semibold hover:bg-primary-dark transition-smooth"
              >
                Create Post
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <div key={post.uri} className="card">
              {/* Post content will be implemented in Phase 4 */}
              <p className="text-gray">Post: {post.title}</p>
            </div>
          ))}
        </div>
      )}

      {/* Sorting Options (for future) */}
      {posts.length > 0 && (
        <div className="mt-6 flex items-center justify-center gap-4 text-sm">
          <button className="text-secondary-blue font-semibold">Hot</button>
          <span className="text-gray">•</span>
          <button className="text-gray hover:text-dark">New</button>
          <span className="text-gray">•</span>
          <button className="text-gray hover:text-dark">Top</button>
        </div>
      )}
    </div>
  );
}
