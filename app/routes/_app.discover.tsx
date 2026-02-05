import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useLoaderData, Link, useSearchParams } from '@remix-run/react';
import { optionalAuth } from '~/lib/auth/require-auth.server';
import { getTrendingPosts, getRisingPosts, listPosts, type TimeFilter } from '~/lib/db/posts.server';
import {
  getTrendingCommunities,
  getRecommendedCommunities,
  getNewCommunities,
  getCommunityStats,
  findCommunityById,
} from '~/lib/db/communities.server';
import { VoteButtons } from '~/components/post/VoteButtons';
import { PostHeader } from '~/components/post/PostHeader';
import { generateMeta } from '~/lib/meta';

export const meta: MetaFunction = () => {
  return generateMeta({
    title: 'Discover',
    description: 'Discover trending posts and rising communities. Find new content and connect with like-minded people.',
  });
};

export async function loader({ request }: LoaderFunctionArgs) {
  const auth = await optionalAuth(request);
  const userId = auth?.user.id;

  const url = new URL(request.url);
  const tab = url.searchParams.get('tab') || 'trending';
  const timeFilter = (url.searchParams.get('t') || 'today') as TimeFilter;

  // Fetch data based on tab
  let posts;
  if (tab === 'trending') {
    posts = await getTrendingPosts({ limit: 20, timeFilter }, userId);
  } else if (tab === 'rising') {
    posts = await getRisingPosts({ limit: 20 }, userId);
  } else {
    // Top posts with time filter
    posts = await listPosts(
      { limit: 20, sortBy: 'top', timeFilter, replyRoot: '' },
      userId
    );
  }

  // Get community names for posts
  const communityMap = new Map<string, string>();
  for (const post of posts) {
    if (!communityMap.has(post.communityId)) {
      const community = await findCommunityById(post.communityId);
      if (community) {
        communityMap.set(post.communityId, community.name);
      }
    }
  }

  const postsWithCommunity = posts.map((post) => ({
    ...post,
    communityName: communityMap.get(post.communityId) || 'unknown',
  }));

  // Fetch sidebar data
  const [trendingCommunities, newCommunities, stats] = await Promise.all([
    getTrendingCommunities({ limit: 5 }, userId),
    getNewCommunities({ limit: 5, daysOld: 14 }, userId),
    getCommunityStats(),
  ]);

  // Get recommended communities if logged in
  const recommendedCommunities = userId
    ? await getRecommendedCommunities(userId, 5)
    : [];

  return json({
    posts: postsWithCommunity,
    trendingCommunities,
    recommendedCommunities,
    newCommunities,
    stats,
    tab,
    timeFilter,
    isAuthenticated: !!auth,
  });
}

export default function Discover() {
  const {
    posts,
    trendingCommunities,
    recommendedCommunities,
    newCommunities,
    stats,
    tab,
    timeFilter,
    isAuthenticated,
  } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();

  const handleTabChange = (newTab: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('tab', newTab);
    if (newTab !== 'top') {
      params.delete('t'); // Remove time filter for non-top tabs
    }
    setSearchParams(params);
  };

  const handleTimeFilterChange = (newTime: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('t', newTime);
    setSearchParams(params);
  };

  return (
    <div className="container-custom">
      <div className="flex gap-6">
        {/* Main Content */}
        <div className="flex-1 max-w-3xl">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-serif mb-2">Discover</h1>
            <p className="text-gray">
              Find trending posts and communities across the platform
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="mb-6 border-b border-gray-200">
            <div className="flex gap-1">
              {[
                { id: 'trending', label: 'Trending', icon: '🔥' },
                { id: 'rising', label: 'Rising', icon: '📈' },
                { id: 'top', label: 'Top', icon: '🏆' },
              ].map(({ id, label, icon }) => (
                <button
                  key={id}
                  onClick={() => handleTabChange(id)}
                  className={`px-4 py-3 font-semibold text-sm border-b-2 transition-smooth ${
                    tab === id
                      ? 'border-secondary-blue text-secondary-blue'
                      : 'border-transparent text-gray hover:text-dark hover:border-gray-300'
                  }`}
                >
                  <span className="mr-1">{icon}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Time Filter (only for Top tab) */}
          {tab === 'top' && (
            <div className="mb-6 flex items-center gap-2">
              <span className="text-sm font-semibold text-gray">Time:</span>
              <div className="flex gap-1">
                {[
                  { id: 'hour', label: 'Hour' },
                  { id: 'today', label: 'Today' },
                  { id: 'week', label: 'Week' },
                  { id: 'month', label: 'Month' },
                  { id: 'year', label: 'Year' },
                  { id: 'all', label: 'All Time' },
                ].map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => handleTimeFilterChange(id)}
                    className={`px-3 py-1 rounded text-sm font-medium transition-smooth ${
                      timeFilter === id
                        ? 'bg-primary text-dark'
                        : 'bg-gray-100 text-gray hover:bg-gray-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Posts */}
          {posts.length === 0 ? (
            <div className="card text-center py-12">
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 bg-primary rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="text-2xl">
                    {tab === 'trending' ? '🔥' : tab === 'rising' ? '📈' : '🏆'}
                  </span>
                </div>
                <h3 className="text-xl font-serif font-bold mb-2">
                  No {tab} posts yet
                </h3>
                <p className="text-gray mb-6">
                  {tab === 'trending'
                    ? 'Posts will appear here as they gain traction.'
                    : tab === 'rising'
                    ? 'New posts with momentum will appear here.'
                    : 'Top posts for this time period will appear here.'}
                </p>
                <Link
                  to="/communities"
                  className="inline-block bg-secondary-blue text-white px-6 py-3 rounded-lg font-semibold hover:bg-opacity-90 transition-smooth"
                >
                  Explore Communities
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post, index) => (
                <DiscoverPostCard
                  key={post.uri}
                  post={post}
                  rank={index + 1}
                  isAuthenticated={isAuthenticated}
                />
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="hidden lg:block w-80 flex-shrink-0">
          <div className="sticky top-6 space-y-6">
            {/* Platform Stats */}
            <div className="card">
              <h3 className="font-serif font-bold mb-4">Platform Stats</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-secondary-blue">
                    {stats.totalCommunities}
                  </div>
                  <div className="text-xs text-gray">Communities</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-secondary-blue">
                    {stats.totalMembers}
                  </div>
                  <div className="text-xs text-gray">Members</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-secondary-blue">
                    {stats.totalPosts}
                  </div>
                  <div className="text-xs text-gray">Posts</div>
                </div>
              </div>
            </div>

            {/* Trending Communities */}
            {trendingCommunities.length > 0 && (
              <div className="card">
                <h3 className="font-serif font-bold mb-4">🔥 Trending Communities</h3>
                <div className="space-y-3">
                  {trendingCommunities.map((community) => (
                    <CommunityCard key={community.id} community={community} />
                  ))}
                </div>
              </div>
            )}

            {/* Recommended Communities (if logged in) */}
            {recommendedCommunities.length > 0 && (
              <div className="card">
                <h3 className="font-serif font-bold mb-4">✨ Recommended For You</h3>
                <div className="space-y-3">
                  {recommendedCommunities.map((community) => (
                    <CommunityCard key={community.id} community={community} />
                  ))}
                </div>
              </div>
            )}

            {/* New Communities */}
            {newCommunities.length > 0 && (
              <div className="card">
                <h3 className="font-serif font-bold mb-4">🆕 New Communities</h3>
                <div className="space-y-3">
                  {newCommunities.map((community) => (
                    <CommunityCard key={community.id} community={community} />
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
  );
}

/**
 * Discover Post Card - includes rank and community badge
 */
function DiscoverPostCard({
  post,
  rank,
  isAuthenticated,
}: {
  post: {
    uri: string;
    title: string | null;
    text: string;
    authorDid: string;
    createdAt: string;
    voteCount: number;
    userVote?: 'up' | 'down' | null;
    commentCount: number;
    tags: string[] | null;
    embedType: string | null;
    communityName: string;
  };
  rank: number;
  isAuthenticated: boolean;
}) {
  const truncatedText =
    post.text.length > 200 ? post.text.slice(0, 200) + '...' : post.text;

  return (
    <div className="card hover:shadow-lg transition-smooth">
      <div className="flex gap-4">
        {/* Rank */}
        <div className="flex-shrink-0 w-8 text-center">
          <span className="text-2xl font-bold text-gray-300">{rank}</span>
        </div>

        {/* Vote Section */}
        <VoteButtons
          postUri={post.uri}
          voteCount={post.voteCount}
          userVote={post.userVote}
          isAuthenticated={isAuthenticated}
          size="large"
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Community Link */}
          <div className="mb-1">
            <Link
              to={`/c/${post.communityName}`}
              className="text-xs font-semibold text-secondary-blue hover:underline"
            >
              c/{post.communityName}
            </Link>
          </div>

          {/* Title */}
          {post.title && (
            <h3 className="text-lg font-serif font-bold mb-1">
              <Link
                to={`/c/${post.communityName}/p/${encodeURIComponent(post.uri)}`}
                className="hover:text-secondary-blue transition-smooth"
              >
                {post.title}
              </Link>
            </h3>
          )}

          {/* Author & Time */}
          <div className="mb-2">
            <PostHeader
              authorDid={post.authorDid}
              createdAt={post.createdAt}
              size="small"
            />
          </div>

          {/* Text Preview */}
          <p className="text-gray text-sm mb-2 line-clamp-2">{truncatedText}</p>

          {/* Footer */}
          <div className="flex items-center gap-3 text-sm text-gray">
            <Link
              to={`/c/${post.communityName}/p/${encodeURIComponent(post.uri)}`}
              className="hover:text-secondary-blue transition-smooth"
            >
              {post.commentCount === 0
                ? 'Add comment'
                : `${post.commentCount} comment${post.commentCount === 1 ? '' : 's'}`}
            </Link>
            {post.embedType === 'images' && (
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Images
              </span>
            )}
            {post.embedType === 'external' && (
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Link
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Community Card for sidebar
 */
function CommunityCard({
  community,
}: {
  community: {
    id: string;
    name: string;
    displayName: string;
    description: string | null;
    memberCount: number;
    isSubscribed?: boolean;
  };
}) {
  return (
    <Link
      to={`/c/${community.name}`}
      className="block p-3 rounded-lg hover:bg-gray-50 transition-smooth -mx-2"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary-blue rounded-full flex items-center justify-center text-white font-bold">
          {community.displayName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate">
            c/{community.name}
          </div>
          <div className="text-xs text-gray">
            {community.memberCount} member{community.memberCount === 1 ? '' : 's'}
          </div>
        </div>
        {community.isSubscribed && (
          <span className="text-xs text-green-600 font-medium">Joined</span>
        )}
      </div>
    </Link>
  );
}
