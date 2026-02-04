import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, Link, useSearchParams, Form } from "@remix-run/react";
import { listCommunities } from "~/services/community.server";
import { optionalAuth } from "~/lib/auth/require-auth.server";
import type { CommunityWithStats } from "~/types/community";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const search = url.searchParams.get("q") || "";
  const sortBy = (url.searchParams.get("sort") || "members") as "members" | "posts" | "created" | "name";
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = 20;
  const offset = (page - 1) * limit;

  // Get optional auth for subscription status
  const auth = await optionalAuth(request);
  const userId = auth?.identity?.providerUserId;

  // Fetch communities
  const communities = await listCommunities(
    {
      search: search || undefined,
      sortBy,
      limit,
      offset,
    },
    userId
  );

  return json({
    communities,
    search,
    sortBy,
    page,
    hasMore: communities.length === limit,
    isAuthenticated: !!auth,
  });
}

type SerializedCommunity = Omit<CommunityWithStats, 'createdAt' | 'updatedAt'> & {
  createdAt: string;
  updatedAt: string;
};

function CommunityCard({ community }: { community: SerializedCommunity }) {
  // Parse avatar if it exists
  const avatar = community.avatar ? JSON.parse(community.avatar) : null;

  return (
    <Link
      to={`/c/${community.name}`}
      className="block card hover:shadow-lg transition-smooth"
    >
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {avatar ? (
            <img
              src={`https://cdn.bsky.app/img/avatar/plain/${community.creatorDid}/${avatar.ref.$link}@jpeg`}
              alt={community.displayName}
              className="w-16 h-16 rounded-full"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
              <span className="text-xl font-bold text-dark">
                {community.displayName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-grow min-w-0">
          <h3 className="text-lg font-serif font-bold text-dark mb-1">
            {community.displayName}
          </h3>
          <p className="text-sm text-gray mb-2">c/{community.name}</p>
          {community.description && (
            <p className="text-sm text-gray line-clamp-2 mb-3">
              {community.description}
            </p>
          )}
          <div className="flex items-center gap-4 text-xs text-gray">
            <span>{community.memberCount.toLocaleString()} members</span>
            <span>•</span>
            <span>{community.postCount.toLocaleString()} posts</span>
            <span>•</span>
            <span className="capitalize">{community.visibility}</span>
          </div>
        </div>

        {/* Subscription Badge */}
        {community.isSubscribed && (
          <div className="flex-shrink-0">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-primary text-dark">
              Joined
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}

export default function Communities() {
  const { communities, search, sortBy, page, hasMore, isAuthenticated } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();

  const handleSortChange = (newSort: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("sort", newSort);
    params.delete("page"); // Reset to page 1 when sorting changes
    setSearchParams(params);
  };

  return (
    <div className="container-custom">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-serif font-bold">Communities</h1>
            {isAuthenticated && (
              <Link
                to="/c/create"
                className="bg-primary text-dark px-4 py-2 rounded-lg font-semibold hover:bg-primary-dark transition-smooth"
              >
                Create Community
              </Link>
            )}
          </div>
          <p className="text-gray">
            Discover and join communities that match your interests
          </p>
        </div>

        {/* Search and Filters */}
        <div className="card mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Input */}
            <Form method="get" className="flex-grow">
              <div className="relative">
                <input
                  type="text"
                  name="q"
                  defaultValue={search}
                  placeholder="Search communities..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <svg
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </Form>

            {/* Sort Dropdown */}
            <div className="flex-shrink-0">
              <select
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value)}
                className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="members">Most Members</option>
                <option value="posts">Most Posts</option>
                <option value="created">Newest</option>
                <option value="name">Alphabetical</option>
              </select>
            </div>
          </div>
        </div>

        {/* Communities Grid */}
        {communities.length === 0 ? (
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
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-serif font-bold mb-2">
                {search ? "No communities found" : "No communities yet"}
              </h3>
              <p className="text-gray mb-6">
                {search
                  ? `No communities match "${search}". Try a different search term.`
                  : "Be the first to create a community!"}
              </p>
              {isAuthenticated && !search && (
                <Link
                  to="/c/create"
                  className="inline-block bg-primary text-dark px-6 py-3 rounded-lg font-semibold hover:bg-primary-dark transition-smooth"
                >
                  Create Community
                </Link>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Community Cards */}
            <div className="space-y-4 mb-6">
              {communities.map((community) => (
                <CommunityCard key={community.id} community={community} />
              ))}
            </div>

            {/* Pagination */}
            {(page > 1 || hasMore) && (
              <div className="flex items-center justify-center gap-4">
                {page > 1 && (
                  <Link
                    to={`?${new URLSearchParams({ ...Object.fromEntries(searchParams), page: (page - 1).toString() })}`}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-smooth"
                  >
                    ← Previous
                  </Link>
                )}
                <span className="text-sm text-gray">
                  Page {page}
                </span>
                {hasMore && (
                  <Link
                    to={`?${new URLSearchParams({ ...Object.fromEntries(searchParams), page: (page + 1).toString() })}`}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-smooth"
                  >
                    Next →
                  </Link>
                )}
              </div>
            )}
          </>
        )}

        {/* Stats Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200 text-center text-sm text-gray">
          <p>
            Showing {communities.length} {communities.length === 1 ? "community" : "communities"}
            {search && ` matching "${search}"`}
          </p>
        </div>
      </div>
    </div>
  );
}
