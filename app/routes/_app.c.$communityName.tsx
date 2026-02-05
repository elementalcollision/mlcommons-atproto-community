import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Outlet, useLoaderData, Link, useLocation } from "@remix-run/react";
import { getCommunity } from "~/services/community.server";
import { optionalAuth } from "~/lib/auth/require-auth.server";
import { getTrendingCommunities, getNewCommunities } from "~/lib/db/communities.server";
import { getCommunityRules, canModerate, isUserBanned } from "~/lib/db/moderation.server";
import { formatDistanceToNow } from "date-fns";
import { communityMeta } from "~/lib/meta";

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data?.community) {
    return [{ title: 'Community Not Found' }];
  }
  return communityMeta(data.community);
};

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { communityName } = params;

  if (!communityName) {
    throw new Response("Community not found", { status: 404 });
  }

  // Get optional auth for subscribe status
  const auth = await optionalAuth(request);
  const userId = auth?.identity?.providerUserId;
  const userDid = auth?.user?.id;

  // Fetch community with stats
  const community = await getCommunity(communityName, userId);

  if (!community) {
    throw new Response("Community not found", { status: 404 });
  }

  // Get related communities for sidebar (exclude current)
  const [trendingCommunities, newCommunities, rules] = await Promise.all([
    getTrendingCommunities({ limit: 3, excludeIds: [community.id] }, userId),
    getNewCommunities({ limit: 3, daysOld: 30 }, userId),
    getCommunityRules(community.id),
  ]);

  // Check if user can moderate this community
  let isModerator = false;
  let isBanned = false;
  if (userDid) {
    const [modCheck, banCheck] = await Promise.all([
      canModerate(community.id, userDid),
      isUserBanned(community.id, userDid),
    ]);
    isModerator = modCheck;
    isBanned = banCheck.banned;
  }

  return json({
    community,
    isAuthenticated: !!auth,
    trendingCommunities,
    newCommunities,
    rules,
    isModerator,
    isBanned,
  });
}

export default function CommunityLayout() {
  const {
    community,
    isAuthenticated,
    trendingCommunities,
    newCommunities,
    rules,
    isModerator,
    isBanned,
  } = useLoaderData<typeof loader>();
  const location = useLocation();

  // Parse avatar and banner BlobRefs if they exist
  const avatar = community.avatar ? JSON.parse(community.avatar) : null;
  const banner = community.banner ? JSON.parse(community.banner) : null;

  // Determine active tab
  const isAboutPage = location.pathname.endsWith("/about");
  const isModPage = location.pathname.endsWith("/mod");

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
            <nav className="flex gap-6 mt-6 border-b border-gray-200 dark:border-gray-700">
              <Link
                to={`/c/${community.name}`}
                className={`pb-3 px-1 font-semibold transition-smooth no-underline ${
                  !isAboutPage && !isModPage
                    ? "text-secondary-blue border-b-2 border-secondary-blue"
                    : "text-gray hover:text-dark dark:hover:text-white"
                }`}
              >
                Posts
              </Link>
              <Link
                to={`/c/${community.name}/about`}
                className={`pb-3 px-1 font-semibold transition-smooth no-underline ${
                  isAboutPage
                    ? "text-secondary-blue border-b-2 border-secondary-blue"
                    : "text-gray hover:text-dark dark:hover:text-white"
                }`}
              >
                About
              </Link>
              {isModerator && (
                <Link
                  to={`/c/${community.name}/mod`}
                  className={`pb-3 px-1 font-semibold transition-smooth no-underline flex items-center gap-1 ${
                    isModPage
                      ? "text-secondary-blue border-b-2 border-secondary-blue"
                      : "text-gray hover:text-dark dark:hover:text-white"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Mod Tools
                </Link>
              )}
            </nav>
          </div>
        </div>
      </div>

      {/* Page Content with Sidebar */}
      <div className="container-custom py-8">
        <div className="flex gap-6">
          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <Outlet />
          </div>

          {/* Sidebar */}
          <aside className="hidden lg:block w-80 flex-shrink-0">
            <div className="sticky top-24 space-y-6">
              {/* About Community Card */}
              <div className="card">
                <h3 className="font-serif font-bold mb-3">About Community</h3>
                {community.description ? (
                  <p className="text-sm text-gray mb-4">{community.description}</p>
                ) : (
                  <p className="text-sm text-gray italic mb-4">No description yet.</p>
                )}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray">Created</span>
                    <span className="font-medium">
                      {formatDistanceToNow(new Date(community.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray">Members</span>
                    <span className="font-medium">{community.memberCount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray">Posts</span>
                    <span className="font-medium">{community.postCount.toLocaleString()}</span>
                  </div>
                </div>
                {isAuthenticated && !isBanned && (
                  <Link
                    to={`/c/${community.name}/submit`}
                    className="block w-full mt-4 py-2 bg-primary text-dark text-center rounded-lg font-semibold hover:bg-primary-dark transition-smooth no-underline"
                  >
                    Create Post
                  </Link>
                )}
                {isBanned && (
                  <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                      You are banned from this community
                    </p>
                  </div>
                )}
              </div>

              {/* Community Rules */}
              <div className="card">
                <h3 className="font-serif font-bold mb-3 dark:text-white">Community Rules</h3>
                {rules.length > 0 ? (
                  <ol className="text-sm space-y-2">
                    {rules.map((rule, index) => (
                      <li key={rule.id} className="flex gap-2">
                        <span className="w-5 h-5 flex items-center justify-center bg-secondary-blue text-white text-xs rounded-full font-medium flex-shrink-0">
                          {index + 1}
                        </span>
                        <div>
                          <span className="font-medium dark:text-white">{rule.title}</span>
                          {rule.description && (
                            <p className="text-gray dark:text-gray-400 text-xs mt-0.5">{rule.description}</p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <ol className="text-sm space-y-2 list-decimal list-inside text-gray dark:text-gray-400">
                    <li>Be respectful and civil</li>
                    <li>No spam or self-promotion</li>
                    <li>Stay on topic</li>
                    <li>No harassment or hate speech</li>
                  </ol>
                )}
                {isModerator && (
                  <Link
                    to={`/c/${community.name}/mod`}
                    className="block mt-3 text-xs text-secondary-blue hover:underline"
                  >
                    Manage rules →
                  </Link>
                )}
              </div>

              {/* Trending Communities */}
              {trendingCommunities.length > 0 && (
                <div className="card">
                  <h3 className="font-serif font-bold mb-3">Trending Communities</h3>
                  <div className="space-y-3">
                    {trendingCommunities.map((c) => (
                      <Link
                        key={c.id}
                        to={`/c/${c.name}`}
                        className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-gray-50 transition-smooth"
                      >
                        <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary-blue rounded-full flex items-center justify-center text-white font-bold text-sm">
                          {c.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm truncate">c/{c.name}</div>
                          <div className="text-xs text-gray">{c.memberCount} members</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* New Communities */}
              {newCommunities.length > 0 && (
                <div className="card">
                  <h3 className="font-serif font-bold mb-3">New Communities</h3>
                  <div className="space-y-3">
                    {newCommunities.map((c) => (
                      <Link
                        key={c.id}
                        to={`/c/${c.name}`}
                        className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-gray-50 transition-smooth"
                      >
                        <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                          {c.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm truncate">c/{c.name}</div>
                          <div className="text-xs text-gray">{c.memberCount} members</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                  <Link
                    to="/communities"
                    className="block mt-4 text-center text-sm text-secondary-blue hover:underline"
                  >
                    View all communities →
                  </Link>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
