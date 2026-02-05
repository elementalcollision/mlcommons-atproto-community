import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useLoaderData, Link, useSearchParams, Form } from '@remix-run/react';
import { formatDistanceToNow } from 'date-fns';
import { optionalAuth } from '~/lib/auth/require-auth.server';
import { searchPosts } from '~/lib/db/posts.server';
import { searchCommunities } from '~/lib/db/communities.server';
import { VoteButtons } from '~/components/post/VoteButtons';
import { PostHeader } from '~/components/post/PostHeader';
import { generateMeta } from '~/lib/meta';
import { enforceRateLimit, rateLimiters } from '~/lib/rate-limiter.server';

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  const query = data?.query;
  return generateMeta({
    title: query ? `Search: ${query}` : 'Search',
    description: query
      ? `Search results for "${query}" on MLCommons Community`
      : 'Search posts and communities on MLCommons',
    noIndex: true, // Don't index search results
  });
};

type SearchTab = 'posts' | 'communities';

export async function loader({ request }: LoaderFunctionArgs) {
  const auth = await optionalAuth(request);
  const url = new URL(request.url);
  const query = url.searchParams.get('q') || '';

  // Rate limit search queries (only when there's a query)
  if (query.trim()) {
    enforceRateLimit(request, rateLimiters.search, 'search');
  }
  const tab = (url.searchParams.get('tab') || 'posts') as SearchTab;
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));

  if (!query.trim()) {
    return json({
      query: '',
      tab,
      posts: [],
      communities: [],
      currentPage: page,
      hasNext: false,
      hasPrevious: false,
      isAuthenticated: !!auth,
    });
  }

  const limit = 20;
  const offset = (page - 1) * limit;

  let posts: any[] = [];
  let communities: any[] = [];
  let hasNext = false;

  if (tab === 'posts') {
    const results = await searchPosts(query, {
      limit: limit + 1,
      offset,
      userId: auth?.user.id,
    });
    hasNext = results.length > limit;
    posts = hasNext ? results.slice(0, limit) : results;
  } else {
    const results = await searchCommunities(query, {
      limit: limit + 1,
      offset,
      userId: auth?.user.id,
    });
    hasNext = results.length > limit;
    communities = hasNext ? results.slice(0, limit) : results;
  }

  return json({
    query,
    tab,
    posts,
    communities,
    currentPage: page,
    hasNext,
    hasPrevious: page > 1,
    isAuthenticated: !!auth,
  });
}

export default function SearchPage() {
  const {
    query,
    tab,
    posts,
    communities,
    currentPage,
    hasNext,
    hasPrevious,
    isAuthenticated,
  } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();

  const handleTabChange = (newTab: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('tab', newTab);
    params.delete('page');
    setSearchParams(params);
  };

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', page.toString());
    setSearchParams(params);
  };

  return (
    <div className="container-custom">
      <div className="max-w-4xl mx-auto">
        {/* Search Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-serif font-bold mb-4 dark:text-white">Search</h1>

          {/* Search Form */}
          <Form method="get" className="flex gap-3">
            <input type="hidden" name="tab" value={tab} />
            <div className="relative flex-1">
              <input
                type="text"
                name="q"
                defaultValue={query}
                placeholder="Search posts and communities..."
                className="w-full px-4 py-3 pl-12 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 dark:text-white text-lg"
              />
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray dark:text-gray-400"
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
            <button
              type="submit"
              className="px-6 py-3 bg-primary text-dark rounded-lg font-semibold hover:bg-primary-dark transition-smooth"
            >
              Search
            </button>
          </Form>
        </div>

        {/* Search Results */}
        {query ? (
          <>
            {/* Tabs */}
            <div className="mb-6 flex gap-2">
              {[
                { id: 'posts', label: 'Posts' },
                { id: 'communities', label: 'Communities' },
              ].map((tabItem) => (
                <button
                  key={tabItem.id}
                  onClick={() => handleTabChange(tabItem.id)}
                  className={`px-6 py-3 rounded-lg font-semibold transition-smooth ${
                    tab === tabItem.id
                      ? 'bg-primary text-dark'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {tabItem.label}
                </button>
              ))}
            </div>

            {/* Results Header */}
            <div className="mb-4 text-gray dark:text-gray-400">
              Showing results for "<span className="font-semibold text-dark dark:text-white">{query}</span>"
            </div>

            {/* Results */}
            {tab === 'posts' ? (
              posts.length === 0 ? (
                <NoResults query={query} type="posts" />
              ) : (
                <div className="space-y-4">
                  {posts.map((post: any) => (
                    <PostResult
                      key={post.uri}
                      post={post}
                      isAuthenticated={isAuthenticated}
                    />
                  ))}
                </div>
              )
            ) : communities.length === 0 ? (
              <NoResults query={query} type="communities" />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {communities.map((community: any) => (
                  <CommunityResult key={community.id} community={community} />
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
                <span className="text-gray dark:text-gray-400 font-medium">
                  Page {currentPage}
                </span>
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={!hasNext}
                  className="px-6 py-2 bg-primary text-dark rounded-lg font-semibold hover:bg-primary-dark transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        ) : (
          /* Empty State */
          <div className="card text-center py-16">
            <svg
              className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <h2 className="text-xl font-serif font-bold mb-2 dark:text-white">
              Start searching
            </h2>
            <p className="text-gray dark:text-gray-400">
              Enter a search term to find posts and communities
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function NoResults({ query, type }: { query: string; type: string }) {
  return (
    <div className="card text-center py-12">
      <svg
        className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <h3 className="text-lg font-serif font-bold mb-2 dark:text-white">
        No {type} found
      </h3>
      <p className="text-gray dark:text-gray-400">
        We couldn't find any {type} matching "{query}"
      </p>
    </div>
  );
}

function PostResult({
  post,
  isAuthenticated,
}: {
  post: any;
  isAuthenticated: boolean;
}) {
  const truncatedText =
    post.text.length > 200 ? post.text.slice(0, 200) + '...' : post.text;

  return (
    <div className="card hover:shadow-lg transition-smooth">
      <div className="flex gap-4">
        {/* Vote Buttons */}
        <VoteButtons
          postUri={post.uri}
          voteCount={post.voteCount}
          userVote={post.userVote}
          isAuthenticated={isAuthenticated}
          size="large"
        />

        <div className="flex-1 min-w-0">
          {/* Community */}
          <Link
            to={`/c/${post.communityName}`}
            className="text-xs text-secondary-blue hover:underline font-medium"
          >
            c/{post.communityName}
          </Link>

          {/* Title */}
          {post.title && (
            <h3 className="text-lg font-serif font-bold mt-1 dark:text-white">
              <Link
                to={`/c/${post.communityName}/p/${encodeURIComponent(post.uri)}`}
                className="hover:text-secondary-blue transition-smooth"
              >
                {post.title}
              </Link>
            </h3>
          )}

          {/* Author & Time */}
          <div className="mt-1">
            <PostHeader
              authorDid={post.authorDid}
              createdAt={post.createdAt}
              size="small"
            />
          </div>

          {/* Text Preview */}
          <p className="text-gray dark:text-gray-400 text-sm mt-2 line-clamp-2">
            {truncatedText}
          </p>

          {/* Footer */}
          <div className="flex items-center gap-3 text-xs text-gray dark:text-gray-400 mt-3">
            <span>{post.commentCount} comments</span>
            <span>•</span>
            <span>
              {formatDistanceToNow(new Date(post.createdAt), {
                addSuffix: true,
              })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function CommunityResult({ community }: { community: any }) {
  return (
    <Link
      to={`/c/${community.name}`}
      className="card hover:shadow-lg transition-smooth flex items-center gap-4"
    >
      {/* Avatar */}
      {community.avatar ? (
        <img
          src={community.avatar}
          alt={community.displayName}
          className="w-16 h-16 rounded-full"
        />
      ) : (
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary-blue flex items-center justify-center text-white font-bold text-2xl">
          {community.displayName[0].toUpperCase()}
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-serif font-bold dark:text-white">
          c/{community.name}
        </h3>
        <p className="text-sm text-gray dark:text-gray-400 line-clamp-2">
          {community.description || 'No description'}
        </p>
        <div className="flex gap-4 text-xs text-gray dark:text-gray-400 mt-1">
          <span>{community.memberCount?.toLocaleString() || 0} members</span>
          <span>{community.postCount?.toLocaleString() || 0} posts</span>
        </div>
      </div>

      {/* Subscribed Badge */}
      {community.isSubscribed && (
        <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-semibold rounded flex-shrink-0">
          Joined
        </span>
      )}
    </Link>
  );
}
