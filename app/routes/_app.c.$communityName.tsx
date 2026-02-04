import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Outlet, useLoaderData, Link, useLocation } from "@remix-run/react";
import { getCommunity } from "~/services/community.server";
import { optionalAuth } from "~/lib/auth/require-auth.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { communityName } = params;

  if (!communityName) {
    throw new Response("Community not found", { status: 404 });
  }

  // Get optional auth for subscribe status
  const auth = await optionalAuth(request);
  const userId = auth?.identity?.providerUserId;

  // Fetch community with stats
  const community = await getCommunity(communityName, userId);

  if (!community) {
    throw new Response("Community not found", { status: 404 });
  }

  return json({ community, isAuthenticated: !!auth });
}

export default function CommunityLayout() {
  const { community, isAuthenticated } = useLoaderData<typeof loader>();
  const location = useLocation();

  // Parse avatar and banner BlobRefs if they exist
  const avatar = community.avatar ? JSON.parse(community.avatar) : null;
  const banner = community.banner ? JSON.parse(community.banner) : null;

  // Determine active tab
  const isAboutPage = location.pathname.endsWith("/about");

  return (
    <div className="min-h-screen bg-light">
      {/* Banner Section */}
      {banner && (
        <div className="w-full h-48 bg-gray-300 overflow-hidden">
          <img
            src={`https://cdn.bsky.app/img/feed_thumbnail/plain/${community.creatorDid}/${banner.ref.$link}@jpeg`}
            alt={`${community.displayName} banner`}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Community Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container-custom">
          <div className="py-6">
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div className="flex-shrink-0">
                {avatar ? (
                  <img
                    src={`https://cdn.bsky.app/img/avatar/plain/${community.creatorDid}/${avatar.ref.$link}@jpeg`}
                    alt={community.displayName}
                    className="w-20 h-20 rounded-full border-4 border-white shadow-lg"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-primary border-4 border-white shadow-lg flex items-center justify-center">
                    <span className="text-2xl font-bold text-dark">
                      {community.displayName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              {/* Community Info */}
              <div className="flex-grow">
                <h1 className="text-3xl font-serif font-bold text-dark mb-1">
                  {community.displayName}
                </h1>
                <p className="text-gray text-sm">c/{community.name}</p>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray">
                  <span>{community.memberCount.toLocaleString()} members</span>
                  <span>•</span>
                  <span>{community.postCount.toLocaleString()} posts</span>
                </div>
              </div>

              {/* Subscribe Button */}
              <div className="flex-shrink-0">
                {isAuthenticated ? (
                  <form method="post" action={`/c/${community.name}/subscribe`}>
                    <button
                      type="submit"
                      className={`px-6 py-2 rounded-lg font-semibold transition-smooth ${
                        community.isSubscribed
                          ? "bg-white border-2 border-primary text-dark hover:bg-gray-50"
                          : "bg-primary text-dark hover:bg-primary-dark"
                      }`}
                    >
                      {community.isSubscribed ? "Joined" : "Join"}
                    </button>
                  </form>
                ) : (
                  <Link
                    to={`/auth/login?redirectTo=/c/${community.name}`}
                    className="px-6 py-2 rounded-lg font-semibold bg-primary text-dark hover:bg-primary-dark transition-smooth inline-block"
                  >
                    Join
                  </Link>
                )}
              </div>
            </div>

            {/* Navigation Tabs */}
            <nav className="flex gap-6 mt-6 border-b border-gray-200">
              <Link
                to={`/c/${community.name}`}
                className={`pb-3 px-1 font-semibold transition-smooth ${
                  !isAboutPage
                    ? "text-secondary-blue border-b-2 border-secondary-blue"
                    : "text-gray hover:text-dark"
                }`}
              >
                Posts
              </Link>
              <Link
                to={`/c/${community.name}/about`}
                className={`pb-3 px-1 font-semibold transition-smooth ${
                  isAboutPage
                    ? "text-secondary-blue border-b-2 border-secondary-blue"
                    : "text-gray hover:text-dark"
                }`}
              >
                About
              </Link>
            </nav>
          </div>
        </div>
      </div>

      {/* Page Content */}
      <div className="container-custom py-8">
        <Outlet />
      </div>
    </div>
  );
}
