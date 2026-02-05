import type { LoaderFunctionArgs, SerializeFrom } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useLoaderData, Link, useSearchParams, Form } from '@remix-run/react';
import { formatDistanceToNow } from 'date-fns';
import { optionalAuth } from '~/lib/auth/require-auth.server';
import { getCommunity } from '~/services/community.server';
import { listPosts } from '~/services/post.server';
import { getUserModeratorRole } from '~/lib/db/moderators.server';
import { VoteButtons } from '~/components/post/VoteButtons';
import { PostHeader } from '~/components/post/PostHeader';

export async function loader({ request, params }: LoaderFunctionArgs) {
  const auth = await optionalAuth(request);
  const communityName = params.communityName!;

  // Parse URL params
  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
  const sortBy = (url.searchParams.get('sort') || 'hot') as
    | 'hot'
    | 'new'
    | 'top';
  const search = url.searchParams.get('q') || '';
  const tag = url.searchParams.get('tag') || '';

  // Get community
  const community = await getCommunity(communityName, auth?.user.id);
  if (!community) {
    throw new Response('Community not found', { status: 404 });
  }

  // Check moderator status to determine if we should show removed posts
  let isModerator = false;
  if (auth?.user.id) {
    const modRole = await getUserModeratorRole(auth.user.id, community.id);
    isModerator = !!modRole;
  }

  // Fetch posts with pagination
  const limit = 20;
  const offset = (page - 1) * limit;

  const posts = await listPosts(
    {
      communityId: community.id,
      limit: limit + 1, // Fetch one extra to check if hasNext
      offset,
      sortBy,
      replyRoot: '', // Only top-level posts (not comments)
      search: search || undefined,
      tag: tag || undefined,
      includeRemoved: isModerator, // Moderators can see removed posts
    },
    auth?.user.id // For vote status
  );

  // Check if there are more posts
  const hasNext = posts.length > limit;
  const displayPosts = hasNext ? posts.slice(0, limit) : posts;

  return json({
    posts: displayPosts,
    community,
    currentPage: page,
    hasNext,
    hasPrevious: page > 1,
    sortBy,
    search,
    tag,
    isAuthenticated: !!auth,
  });
}

export default function CommunityPosts() {
  const {
    posts,
    community,
    currentPage,
    hasNext,
    hasPrevious,
    sortBy,
    search,
    tag,
    isAuthenticated,
  } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();

  // Sort change handler
  const handleSortChange = (newSort: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('sort', newSort);
    params.delete('page'); // Reset to page 1
    setSearchParams(params);
  };

  // Pagination handlers
  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', page.toString());
    setSearchParams(params);
  };

  // Clear search
  const clearSearch = () => {
    const params = new URLSearchParams(searchParams);
    params.delete('q');
    params.delete('page');
    setSearchParams(params);
  };

  // Filter by tag
  const filterByTag = (tagName: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('tag', tagName);
    params.delete('page'); // Reset to page 1
    setSearchParams(params);
  };

  // Clear tag filter
  const clearTagFilter = () => {
    const params = new URLSearchParams(searchParams);
    params.delete('tag');
    params.delete('page');
    setSearchParams(params);
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Post Creation Section */}
      {isAuthenticated && (
        <div className="card mb-6">
          <Link
            to={`/c/${community.name}/submit`}
            className="block w-full p-4 text-left text-gray hover:bg-gray-50 rounded-lg transition-smooth border border-gray-200"
          >
            Create a post in this community...
          </Link>
        </div>
      )}

      {/* Search Bar */}
      <div className="mb-6">
        <Form method="get" className="flex gap-2">
          {/* Preserve current sort */}
          <input type="hidden" name="sort" value={sortBy} />
          <div className="relative flex-1">
            <input
              type="text"
              name="q"
              defaultValue={search}
              placeholder="Search posts..."
              className="w-full px-4 py-2 pl-10 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray"
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
            className="px-4 py-2 bg-primary text-dark rounded-lg font-semibold hover:bg-primary-dark transition-smooth"
          >
            Search
          </button>
          {search && (
            <button
              type="button"
              onClick={clearSearch}
              className="px-4 py-2 bg-gray-100 text-gray rounded-lg font-semibold hover:bg-gray-200 transition-smooth"
            >
              Clear
            </button>
          )}
        </Form>
      </div>

      {/* Search Results Header */}
      {search && (
        <div className="mb-4 p-3 bg-secondary-blue/10 rounded-lg flex items-center justify-between">
          <span className="text-sm">
            Showing results for "<span className="font-semibold">{search}</span>"
            {posts.length === 0 ? ' - No posts found' : ` - ${posts.length} post${posts.length === 1 ? '' : 's'} found`}
          </span>
          <button
            onClick={clearSearch}
            className="text-sm text-secondary-blue hover:underline"
          >
            Clear search
          </button>
        </div>
      )}

      {/* Tag Filter Header */}
      {tag && (
        <div className="mb-4 p-3 bg-primary/20 rounded-lg flex items-center justify-between">
          <span className="text-sm flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            Filtering by tag: <span className="font-semibold bg-primary px-2 py-0.5 rounded">{tag}</span>
            {posts.length === 0 ? ' - No posts found' : ` - ${posts.length} post${posts.length === 1 ? '' : 's'}`}
          </span>
          <button
            onClick={clearTagFilter}
            className="text-sm text-dark hover:underline font-medium"
          >
            Clear filter
          </button>
        </div>
      )}

      {/* Sort Selector */}
      {posts.length > 0 && (
        <div className="mb-6 flex items-center gap-3">
          <span className="text-sm font-semibold text-gray">Sort by:</span>
          <div className="flex gap-2">
            {['hot', 'new', 'top'].map((sort) => (
              <button
                key={sort}
                onClick={() => handleSortChange(sort)}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-smooth ${
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
            <h3 className="text-xl font-serif font-bold mb-2">No posts yet</h3>
            <p className="text-gray mb-6">
              Be the first to start a conversation in this community!
            </p>
            {isAuthenticated && (
              <Link
                to={`/c/${community.name}/submit`}
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
            <PostCard
              key={post.uri}
              post={post}
              communityName={community.name}
              isAuthenticated={isAuthenticated}
              onTagClick={filterByTag}
              activeTag={tag}
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
  );
}

/**
 * Post Card Component
 */
function PostCard({
  post,
  communityName,
  isAuthenticated,
  onTagClick,
  activeTag,
}: {
  post: SerializeFrom<typeof loader>['posts'][number];
  communityName: string;
  isAuthenticated: boolean;
  onTagClick: (tag: string) => void;
  activeTag: string;
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
                to={`/c/${communityName}/p/${encodeURIComponent(post.uri)}`}
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
              to={`/c/${communityName}/p/${encodeURIComponent(post.uri)}`}
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
                    <button
                      key={tagName}
                      onClick={(e) => {
                        e.preventDefault();
                        onTagClick(tagName);
                      }}
                      className={`px-2 py-0.5 rounded text-xs transition-smooth ${
                        activeTag === tagName
                          ? 'bg-primary text-dark font-semibold'
                          : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      {tagName}
                    </button>
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
