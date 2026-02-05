import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useLoaderData, Link, useSearchParams } from '@remix-run/react';
import { optionalAuth } from '~/lib/auth/require-auth.server';
import { listPosts } from '~/services/post.server';
import type { TimeFilter } from '~/lib/db/posts.server';
import { getUserSubscribedCommunityIds, findCommunityById } from '~/lib/db/communities.server';
import { VoteButtons } from '~/components/post/VoteButtons';
import { PostHeader } from '~/components/post/PostHeader';

export const meta: MetaFunction = () => {
  return [
    { title: 'Home - MLCommons Community' },
    { name: 'description', content: 'Your personalized community feed' },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const auth = await optionalAuth(request);
  const userId = auth?.user.id;

  // Parse URL params
  const url = new URL(request.url);
  const feed = (url.searchParams.get('feed') || 'all') as 'all' | 'subscribed';
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
  const sortBy = (url.searchParams.get('sort') || 'hot') as 'hot' | 'new' | 'top' | 'trending';
  const timeFilter = (url.searchParams.get('t') || 'all') as TimeFilter;

  // Get subscribed community IDs for authenticated users
  let subscribedCommunityIds: string[] = [];
  if (userId) {
    subscribedCommunityIds = await getUserSubscribedCommunityIds(userId);
  }

  // Build query options based on feed type
  const limit = 20;
  const offset = (page - 1) * limit;

  let posts;
  if (feed === 'subscribed' && userId && subscribedCommunityIds.length > 0) {
    // Subscribed feed: posts from joined communities only
    posts = await listPosts(
      {
        communityIds: subscribedCommunityIds,
        limit: limit + 1,
        offset,
        sortBy,
        timeFilter,
        replyRoot: '', // Only top-level posts
      },
      userId
    );
  } else {
    // All feed: posts from all communities
    posts = await listPosts(
      {
        limit: limit + 1,
        offset,
        sortBy,
        timeFilter,
        replyRoot: '', // Only top-level posts
      },
      userId
    );
  }

  // Check if there are more posts
  const hasNext = posts.length > limit;
  const displayPosts = hasNext ? posts.slice(0, limit) : posts;

  // Get community names for posts
  const communityMap = new Map<string, string>();
  for (const post of displayPosts) {
    if (!communityMap.has(post.communityId)) {
      const community = await findCommunityById(post.communityId);
      if (community) {
        communityMap.set(post.communityId, community.name);
      }
    }
  }

  // Add community name to each post
  const postsWithCommunity = displayPosts.map((post) => ({
    ...post,
    communityName: communityMap.get(post.communityId) || 'unknown',
  }));

  return json({
    posts: postsWithCommunity,
    feed,
    sortBy,
    timeFilter,
    currentPage: page,
    hasNext,
    hasPrevious: page > 1,
    isAuthenticated: !!auth,
    hasSubscriptions: subscribedCommunityIds.length > 0,
  });
}

export default function Home() {
  const {
    posts,
    feed,
    sortBy,
    timeFilter,
    currentPage,
    hasNext,
    hasPrevious,
    isAuthenticated,
    hasSubscriptions,
  } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();

  // Feed change handler
  const handleFeedChange = (newFeed: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('feed', newFeed);
    params.delete('page'); // Reset to page 1
    setSearchParams(params);
  };

  // Sort change handler
  const handleSortChange = (newSort: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('sort', newSort);
    params.delete('page');
    // Clear time filter when not on top sort
    if (newSort !== 'top') {
      params.delete('t');
    }
    setSearchParams(params);
  };

  // Time filter handler
  const handleTimeFilterChange = (newTime: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('t', newTime);
    params.delete('page');
    setSearchParams(params);
  };

  // Pagination handlers
  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', page.toString());
    setSearchParams(params);
  };

  return (
    <div className="container-custom">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-serif mb-2">Your Feed</h1>
          <p className="text-gray">
            {feed === 'subscribed'
              ? 'Posts from communities you follow'
              : 'Posts from all communities'}
          </p>
        </div>

        {/* Feed Selector */}
        <div className="mb-6 flex items-center gap-4">
          <div className="flex gap-2">
            <button
              onClick={() => handleFeedChange('all')}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-smooth ${
                feed === 'all'
                  ? 'bg-secondary-blue text-white'
                  : 'bg-gray-100 text-gray hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => handleFeedChange('subscribed')}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-smooth ${
                feed === 'subscribed'
                  ? 'bg-secondary-blue text-white'
                  : 'bg-gray-100 text-gray hover:bg-gray-200'
              }`}
              disabled={!isAuthenticated}
              title={!isAuthenticated ? 'Sign in to see your subscribed feed' : undefined}
            >
              Subscribed
            </button>
          </div>

          {/* Sort Selector */}
          {posts.length > 0 && (
            <div className="ml-auto flex items-center gap-3">
              <span className="text-sm font-semibold text-gray">Sort:</span>
              <div className="flex gap-2">
                {['hot', 'new', 'trending', 'top'].map((sort) => (
                  <button
                    key={sort}
                    onClick={() => handleSortChange(sort)}
                    className={`px-3 py-1 rounded font-semibold text-sm transition-smooth ${
                      sortBy === sort
                        ? 'bg-primary text-dark'
                        : 'bg-gray-100 text-gray hover:bg-gray-200'
                    }`}
                  >
                    {sort.charAt(0).toUpperCase() + sort.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Time Filter (only for Top sort) */}
        {sortBy === 'top' && (
          <div className="mb-6 flex items-center gap-2">
            <span className="text-sm font-semibold text-gray">Time:</span>
            <div className="flex gap-1 flex-wrap">
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
                      ? 'bg-secondary-blue text-white'
                      : 'bg-gray-100 text-gray hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Empty State for Subscribed Feed */}
        {feed === 'subscribed' && !hasSubscriptions && isAuthenticated ? (
          <div className="card text-center py-12">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-secondary-blue rounded-full mx-auto mb-4 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-serif font-bold mb-2">
                No subscriptions yet
              </h3>
              <p className="text-gray mb-6">
                Join communities to see their posts in your subscribed feed.
              </p>
              <Link
                to="/communities"
                className="inline-block bg-secondary-blue text-white px-6 py-3 rounded-lg font-semibold hover:bg-opacity-90 transition-smooth"
              >
                Explore Communities
              </Link>
            </div>
          </div>
        ) : posts.length === 0 ? (
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
              <h3 className="text-xl font-serif font-bold mb-2">No posts yet</h3>
              <p className="text-gray mb-6">
                {feed === 'subscribed'
                  ? 'No posts from your subscribed communities yet.'
                  : 'Be the first to start a conversation!'}
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
          /* Posts Feed */
          <div className="space-y-4">
            {posts.map((post) => (
              <GlobalPostCard
                key={post.uri}
                post={post}
                isAuthenticated={isAuthenticated}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {(hasPrevious || hasNext) && (
          <div className="mt-8 flex items-center justify-between">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={!hasPrevious}
              className="px-6 py-2 bg-primary text-dark rounded-lg font-semibold hover:bg-primary-dark transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Previous
            </button>
            <span className="text-gray font-medium">Page {currentPage}</span>
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={!hasNext}
              className="px-6 py-2 bg-primary text-dark rounded-lg font-semibold hover:bg-primary-dark transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Global Post Card Component
 * Similar to community PostCard but includes community name
 */
function GlobalPostCard({
  post,
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
    isPinned: boolean;
    isLocked: boolean;
    isRemoved: boolean;
  };
  isAuthenticated: boolean;
}) {
  // Truncate text for preview
  const truncatedText =
    post.text.length > 300 ? post.text.slice(0, 300) + '...' : post.text;

  return (
    <div className="card hover:shadow-lg transition-smooth">
      <div className="flex gap-4">
        {/* Left: Vote Section */}
        <VoteButtons
          postUri={post.uri}
          voteCount={post.voteCount}
          userVote={post.userVote}
          isAuthenticated={isAuthenticated}
          size="large"
        />

        {/* Right: Content */}
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

          {/* Status Indicators */}
          {(post.isPinned || post.isLocked || post.isRemoved) && (
            <div className="flex flex-wrap gap-1 mb-2">
              {post.isPinned && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-800 text-xs font-semibold rounded">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  Pinned
                </span>
              )}
              {post.isLocked && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Locked
                </span>
              )}
              {post.isRemoved && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-800 text-xs font-semibold rounded">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                  Removed
                </span>
              )}
            </div>
          )}

          {/* Title */}
          {post.title && (
            <h3 className="text-xl font-serif font-bold mb-2">
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
          <p className="text-gray mb-3 whitespace-pre-wrap break-words">
            {truncatedText}
          </p>

          {/* Image indicator */}
          {post.embedType === 'images' && (
            <div className="text-sm text-gray mb-3 flex items-center gap-1">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span>Has images</span>
            </div>
          )}

          {/* External link indicator */}
          {post.embedType === 'external' && (
            <div className="text-sm text-gray mb-3 flex items-center gap-1">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
              <span>External link</span>
            </div>
          )}

          {/* Footer Metadata */}
          <div className="flex items-center gap-2 text-sm text-gray flex-wrap">
            <Link
              to={`/c/${post.communityName}/p/${encodeURIComponent(post.uri)}`}
              className="hover:text-secondary-blue transition-smooth"
            >
              {post.commentCount === 0
                ? 'Add comment'
                : `${post.commentCount} comment${post.commentCount === 1 ? '' : 's'}`}
            </Link>
            {post.tags && post.tags.length > 0 && (
              <>
                <span>•</span>
                <div className="flex gap-1">
                  {post.tags.slice(0, 3).map((tagName: string) => (
                    <Link
                      key={tagName}
                      to={`/c/${post.communityName}?tag=${encodeURIComponent(tagName)}`}
                      className="px-2 py-0.5 bg-gray-100 rounded text-xs hover:bg-gray-200 transition-smooth"
                    >
                      {tagName}
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
