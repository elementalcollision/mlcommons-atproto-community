import type { LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useLoaderData, Link, useSearchParams } from '@remix-run/react';
import { formatDistanceToNow } from 'date-fns';
import { optionalAuth } from '~/lib/auth/require-auth.server';
import {
  getUserProfile,
  getUserPosts,
  getUserComments,
  getUserCommunities,
  getUserSavedPosts,
} from '~/services/user.server';
import { VoteButtons } from '~/components/post/VoteButtons';

type TabType = 'posts' | 'comments' | 'communities' | 'saved';

export async function loader({ request, params }: LoaderFunctionArgs) {
  const auth = await optionalAuth(request);
  const userId = params.userId!;

  // Parse URL params
  const url = new URL(request.url);
  const tab = (url.searchParams.get('tab') || 'posts') as TabType;
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));

  // Get user profile
  const profile = await getUserProfile(userId, auth?.user.id);
  if (!profile) {
    throw new Response('User not found', { status: 404 });
  }

  const isOwnProfile = auth?.user.id === userId;
  const limit = 20;
  const offset = (page - 1) * limit;

  // Fetch data based on tab
  let items: any[] = [];
  let hasNext = false;

  switch (tab) {
    case 'posts':
      items = await getUserPosts(
        userId,
        { limit: limit + 1, offset, sortBy: 'new' },
        auth?.user.id
      );
      break;
    case 'comments':
      items = await getUserComments(
        userId,
        { limit: limit + 1, offset, sortBy: 'new' },
        auth?.user.id
      );
      break;
    case 'communities':
      items = await getUserCommunities(userId, { limit: limit + 1, offset });
      break;
    case 'saved':
      // Only show saved posts if viewing own profile
      if (isOwnProfile) {
        items = await getUserSavedPosts(
          userId,
          { limit: limit + 1, offset },
          auth?.user.id
        );
      }
      break;
  }

  // Check if there are more items
  hasNext = items.length > limit;
  const displayItems = hasNext ? items.slice(0, limit) : items;

  return json({
    profile,
    items: displayItems,
    tab,
    currentPage: page,
    hasNext,
    hasPrevious: page > 1,
    isOwnProfile,
    isAuthenticated: !!auth,
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
    isAuthenticated,
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

  // Available tabs
  const tabs = [
    { id: 'posts', label: 'Posts', count: profile.totalPosts },
    { id: 'comments', label: 'Comments', count: profile.totalComments },
    { id: 'communities', label: 'Communities', count: null },
  ];

  // Only show saved tab for own profile
  if (isOwnProfile) {
    tabs.push({ id: 'saved', label: 'Saved', count: null });
  }

  return (
    <div className="container-custom">
      <div className="max-w-4xl mx-auto">
        {/* Profile Header */}
        <div className="card mb-6">
          <div className="flex flex-col md:flex-row items-start gap-6">
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
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-serif font-bold mb-2 dark:text-white">
                {profile.displayName || 'Anonymous User'}
              </h1>

              {profile.bio && (
                <p className="text-gray dark:text-gray-400 mb-4 whitespace-pre-wrap">{profile.bio}</p>
              )}

              <div className="flex items-center gap-4 text-sm text-gray dark:text-gray-400">
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
            <div className="flex gap-4 md:gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-secondary-blue">
                  {profile.totalKarma.toLocaleString()}
                </div>
                <div className="text-xs text-gray dark:text-gray-400 uppercase">Total Karma</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-secondary-blue">
                  {(profile.postKarma || 0).toLocaleString()}
                </div>
                <div className="text-xs text-gray dark:text-gray-400 uppercase">Post</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-secondary-blue">
                  {(profile.commentKarma || 0).toLocaleString()}
                </div>
                <div className="text-xs text-gray dark:text-gray-400 uppercase">Comment</div>
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 flex gap-8 text-sm">
            <div>
              <span className="font-semibold dark:text-white">{profile.totalPosts}</span>{' '}
              <span className="text-gray dark:text-gray-400">posts</span>
            </div>
            <div>
              <span className="font-semibold dark:text-white">{profile.totalComments}</span>{' '}
              <span className="text-gray dark:text-gray-400">comments</span>
            </div>
          </div>
        </div>

        {/* Activity Tabs */}
        <div className="mb-6 flex gap-2 flex-wrap">
          {tabs.map((tabItem) => (
            <button
              key={tabItem.id}
              onClick={() => handleTabChange(tabItem.id)}
              className={`px-6 py-3 rounded-lg font-semibold transition-smooth flex items-center gap-2 ${
                tab === tabItem.id
                  ? 'bg-primary text-dark'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {tabItem.label}
              {tabItem.count !== null && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  tab === tabItem.id
                    ? 'bg-dark/20 text-dark'
                    : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                }`}>
                  {tabItem.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content based on tab */}
        {tab === 'communities' ? (
          <CommunityList items={items} />
        ) : tab === 'saved' && !isOwnProfile ? (
          <div className="card text-center py-12">
            <p className="text-gray dark:text-gray-400">
              You can only view your own saved posts.
            </p>
          </div>
        ) : items.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray dark:text-gray-400">
              No {tab} yet.
              {isOwnProfile && tab === 'posts' && ' Start contributing to communities!'}
              {isOwnProfile && tab === 'saved' && ' Save posts to see them here.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item: any) => (
              <PostItem
                key={item.uri}
                item={item}
                tab={tab}
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
            <span className="text-gray dark:text-gray-400 font-medium">Page {currentPage}</span>
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

function PostItem({
  item,
  tab,
  isAuthenticated,
}: {
  item: any;
  tab: string;
  isAuthenticated: boolean;
}) {
  // Get community name from communityId - in production, we'd fetch this
  // For now, use the communityId
  const communityLink = item.communityName
    ? `/c/${item.communityName}`
    : `/c/${item.communityId}`;

  return (
    <div className="card hover:shadow-lg transition-smooth">
      <div className="flex gap-4">
        {/* Vote Buttons */}
        <VoteButtons
          postUri={item.uri}
          voteCount={item.voteCount}
          userVote={item.userVote}
          isAuthenticated={isAuthenticated}
          size="large"
        />

        <div className="flex-1 min-w-0">
          {/* Post/Comment Preview */}
          <div className="mb-3">
            {item.title && (
              <h3 className="text-lg font-serif font-bold mb-2 dark:text-white">
                <Link
                  to={`${communityLink}/p/${encodeURIComponent(item.replyRoot || item.uri)}`}
                  className="hover:text-secondary-blue transition-smooth"
                >
                  {item.title}
                </Link>
              </h3>
            )}
            <p className="text-gray dark:text-gray-400 text-sm line-clamp-3">
              {item.text.slice(0, 200)}
              {item.text.length > 200 && '...'}
            </p>
          </div>

          {/* Metadata */}
          <div className="flex items-center gap-3 text-xs text-gray dark:text-gray-400 flex-wrap">
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
                  to={`${communityLink}/p/${encodeURIComponent(item.replyRoot)}`}
                  className="text-secondary-blue hover:underline"
                >
                  View original post
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CommunityList({ items }: { items: any[] }) {
  if (items.length === 0) {
    return (
      <div className="card text-center py-12">
        <p className="text-gray dark:text-gray-400">
          No communities joined yet.
        </p>
        <Link
          to="/communities"
          className="inline-block mt-4 px-6 py-2 bg-primary text-dark rounded-lg font-semibold hover:bg-primary-dark transition-smooth"
        >
          Discover Communities
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {items.map((community: any) => (
        <Link
          key={community.id}
          to={`/c/${community.name}`}
          className="card hover:shadow-lg transition-smooth flex items-center gap-4"
        >
          {/* Avatar */}
          {community.avatar ? (
            <img
              src={community.avatar}
              alt={community.displayName}
              className="w-14 h-14 rounded-full"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-secondary-blue flex items-center justify-center text-white font-bold text-xl">
              {community.displayName[0].toUpperCase()}
            </div>
          )}

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-serif font-bold truncate dark:text-white">
              c/{community.name}
            </h3>
            <p className="text-sm text-gray dark:text-gray-400 truncate">
              {community.description || 'No description'}
            </p>
            <div className="flex gap-4 text-xs text-gray dark:text-gray-400 mt-1">
              <span>{community.memberCount?.toLocaleString() || 0} members</span>
              <span>{community.postCount?.toLocaleString() || 0} posts</span>
            </div>
          </div>

          {/* Subscribed Badge */}
          {community.isSubscribed && (
            <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-semibold rounded">
              Joined
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}
