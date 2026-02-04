import type { LoaderFunctionArgs, SerializeFrom } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useLoaderData, Link, useSearchParams } from '@remix-run/react';
import { formatDistanceToNow } from 'date-fns';
import { optionalAuth } from '~/lib/auth/require-auth.server';
import { getCommunity } from '~/services/community.server';
import { listPosts } from '~/services/post.server';
import { VoteButtons } from '~/components/post/VoteButtons';

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

  // Get community
  const community = await getCommunity(communityName, auth?.user.id);
  if (!community) {
    throw new Response('Community not found', { status: 404 });
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
}: {
  post: SerializeFrom<typeof loader>['posts'][number];
  communityName: string;
  isAuthenticated: boolean;
}) {
  // Format timestamp
  const timeAgo = formatDistanceToNow(new Date(post.createdAt), {
    addSuffix: true,
  });

  // Truncate text for preview
  const truncatedText =
    post.text.length > 300 ? post.text.slice(0, 300) + '...' : post.text;

  // Format author DID for display (show first 12 chars)
  const authorDisplay = post.authorDid.startsWith('did:')
    ? post.authorDid.slice(0, 20) + '...'
    : post.authorDid;

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

          {/* Metadata */}
          <div className="flex items-center gap-2 text-sm text-gray flex-wrap">
            <span title={post.authorDid}>{authorDisplay}</span>
            <span>•</span>
            <span>{timeAgo}</span>
            <span>•</span>
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
                  {post.tags.slice(0, 3).map((tag: string) => (
                    <span
                      key={tag}
                      className="bg-gray-100 px-2 py-0.5 rounded text-xs"
                    >
                      {tag}
                    </span>
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
