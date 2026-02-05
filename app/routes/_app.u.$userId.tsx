import type { LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useLoaderData, Link, useSearchParams } from '@remix-run/react';
import { formatDistanceToNow } from 'date-fns';
import { optionalAuth } from '~/lib/auth/require-auth.server';
import { getUserProfile, getUserPosts, getUserComments } from '~/services/user.server';

export async function loader({ request, params }: LoaderFunctionArgs) {
  const auth = await optionalAuth(request);
  const userId = params.userId!;

  // Parse URL params
  const url = new URL(request.url);
  const tab = (url.searchParams.get('tab') || 'posts') as 'posts' | 'comments';
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));

  // Get user profile
  const profile = await getUserProfile(userId, auth?.user.id);
  if (!profile) {
    throw new Response('User not found', { status: 404 });
  }

  // Fetch posts or comments based on tab
  const limit = 20;
  const offset = (page - 1) * limit;

  const items =
    tab === 'posts'
      ? await getUserPosts(
          userId,
          { limit: limit + 1, offset, sortBy: 'new' },
          auth?.user.id
        )
      : await getUserComments(
          userId,
          { limit: limit + 1, offset, sortBy: 'new' },
          auth?.user.id
        );

  // Check if there are more items
  const hasNext = items.length > limit;
  const displayItems = hasNext ? items.slice(0, limit) : items;

  return json({
    profile,
    items: displayItems,
    tab,
    currentPage: page,
    hasNext,
    hasPrevious: page > 1,
    isOwnProfile: auth?.user.id === userId,
  });
}

export default function UserProfile() {
  const {
    profile,
    items,
    tab,
    currentPage,
    hasNext,
    hasPrevious,
    isOwnProfile,
  } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab change handler
  const handleTabChange = (newTab: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('tab', newTab);
    params.delete('page'); // Reset to page 1
    setSearchParams(params);
  };

  // Pagination handlers
  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', page.toString());
    setSearchParams(params);
  };

  // Format join date
  const joinedDate = new Date(profile.createdAt);
  const joinedAgo = formatDistanceToNow(joinedDate, { addSuffix: true });

  return (
    <div className="container-custom">
      <div className="max-w-4xl mx-auto">
        {/* Profile Header */}
        <div className="card mb-6">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="flex-shrink-0">
              {profile.avatar ? (
                <img
                  src={profile.avatar}
                  alt={profile.displayName || 'User avatar'}
                  className="w-24 h-24 rounded-full"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-3xl font-serif font-bold text-dark">
                    {(profile.displayName || profile.email || 'U')[0].toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              <h1 className="text-3xl font-serif font-bold mb-2">
                {profile.displayName || 'Anonymous User'}
              </h1>

              {profile.bio && (
                <p className="text-gray mb-4 whitespace-pre-wrap">{profile.bio}</p>
              )}

              <div className="flex items-center gap-4 text-sm text-gray">
                <div className="flex items-center gap-2">
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
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <span>Joined {joinedAgo}</span>
                </div>

                {profile.email && isOwnProfile && (
                  <>
                    <span>•</span>
                    <span>{profile.email}</span>
                  </>
                )}
              </div>
            </div>

            {/* Karma Stats */}
            <div className="flex gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-secondary-blue">
                  {profile.totalKarma}
                </div>
                <div className="text-xs text-gray uppercase">Total Karma</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-secondary-blue">
                  {profile.postKarma || 0}
                </div>
                <div className="text-xs text-gray uppercase">Post</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-secondary-blue">
                  {profile.commentKarma || 0}
                </div>
                <div className="text-xs text-gray uppercase">Comment</div>
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="mt-6 pt-6 border-t border-gray-200 flex gap-8 text-sm">
            <div>
              <span className="font-semibold">{profile.totalPosts}</span>{' '}
              <span className="text-gray">posts</span>
            </div>
            <div>
              <span className="font-semibold">{profile.totalComments}</span>{' '}
              <span className="text-gray">comments</span>
            </div>
          </div>
        </div>

        {/* Activity Tabs */}
        <div className="mb-6 flex gap-2">
          {['posts', 'comments'].map((tabName) => (
            <button
              key={tabName}
              onClick={() => handleTabChange(tabName)}
              className={`px-6 py-3 rounded-lg font-semibold transition-smooth ${
                tab === tabName
                  ? 'bg-primary text-dark'
                  : 'bg-gray-100 text-gray hover:bg-gray-200'
              }`}
            >
              {tabName.charAt(0).toUpperCase() + tabName.slice(1)}
            </button>
          ))}
        </div>

        {/* Content List */}
        {items.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray">
              No {tab} yet.
              {isOwnProfile && ' Start contributing to communities!'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.uri} className="card hover:shadow-lg transition-smooth">
                {/* Post/Comment Preview */}
                <div className="mb-3">
                  {item.title && (
                    <h3 className="text-lg font-serif font-bold mb-2">
                      <Link
                        to={`/c/${item.communityId}/p/${encodeURIComponent(item.uri)}`}
                        className="hover:text-secondary-blue transition-smooth"
                      >
                        {item.title}
                      </Link>
                    </h3>
                  )}
                  <p className="text-gray text-sm line-clamp-3">
                    {item.text.slice(0, 200)}
                    {item.text.length > 200 && '...'}
                  </p>
                </div>

                {/* Metadata */}
                <div className="flex items-center gap-3 text-xs text-gray">
                  <span className="font-semibold">{item.voteCount} votes</span>
                  <span>•</span>
                  <span>{item.commentCount} comments</span>
                  <span>•</span>
                  <span>
                    {formatDistanceToNow(new Date(item.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                  {tab === 'comments' && item.replyRoot && (
                    <>
                      <span>•</span>
                      <Link
                        to={`/c/${item.communityId}/p/${encodeURIComponent(item.replyRoot)}`}
                        className="text-secondary-blue hover:underline"
                      >
                        View post
                      </Link>
                    </>
                  )}
                </div>
              </div>
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
