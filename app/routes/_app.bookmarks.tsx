import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { formatDistanceToNow } from "date-fns";
import { requireAuth } from "~/lib/auth/require-auth.server";
import { getUserBookmarks } from "~/lib/db/bookmarks.server";
import { VoteButtons } from "~/components/post/VoteButtons";
import { BookmarkButton } from "~/components/post/BookmarkButton";

export const meta: MetaFunction = () => {
  return [
    { title: "Saved Posts - MLCommons Community" },
    { name: "description", content: "Your saved posts" },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const auth = await requireAuth(request);
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = 20;
  const offset = (page - 1) * limit;

  const { bookmarks, total } = await getUserBookmarks(auth.user.id, {
    limit,
    offset,
  });

  return json({
    bookmarks,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

export default function BookmarksPage() {
  const { bookmarks, total, page, totalPages } = useLoaderData<typeof loader>();

  return (
    <div className="container-custom max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-serif font-bold">Saved Posts</h1>
        <p className="text-gray text-sm">
          {total} saved post{total === 1 ? "" : "s"}
        </p>
      </div>

      {/* Bookmarks List */}
      {bookmarks.length === 0 ? (
        <div className="card text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-serif font-bold mb-2">No saved posts yet</h3>
          <p className="text-gray mb-6">
            When you save posts, they'll appear here for easy access.
          </p>
          <Link
            to="/discover"
            className="inline-block bg-primary text-dark px-6 py-3 rounded-lg font-semibold hover:bg-primary-dark transition-smooth"
          >
            Discover Posts
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {bookmarks.map(({ bookmark, post }) => (
              <BookmarkedPostCard
                key={bookmark.id}
                post={post}
                bookmarkedAt={bookmark.createdAt}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex justify-center gap-2">
              {page > 1 && (
                <Link
                  to={`?page=${page - 1}`}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-smooth"
                >
                  Previous
                </Link>
              )}
              <span className="px-4 py-2 text-gray">
                Page {page} of {totalPages}
              </span>
              {page < totalPages && (
                <Link
                  to={`?page=${page + 1}`}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-smooth"
                >
                  Next
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function BookmarkedPostCard({
  post,
  bookmarkedAt,
}: {
  post: {
    uri: string;
    title: string | null;
    text: string;
    authorDid: string;
    createdAt: Date;
    voteCount: number;
    commentCount: number;
    communityId: string;
    communityName: string;
  };
  bookmarkedAt: string;
}) {
  const truncatedText =
    post.text.length > 200 ? post.text.slice(0, 200) + "..." : post.text;

  return (
    <div className="card hover:shadow-lg transition-smooth">
      <div className="flex gap-4">
        {/* Vote Section */}
        <VoteButtons
          postUri={post.uri}
          voteCount={post.voteCount}
          userVote={null}
          isAuthenticated={true}
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
            <span className="text-xs text-gray ml-2">
              Saved {formatDistanceToNow(new Date(bookmarkedAt), { addSuffix: true })}
            </span>
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

          {/* Text Preview */}
          <p className="text-gray text-sm mb-2 line-clamp-2">{truncatedText}</p>

          {/* Footer */}
          <div className="flex items-center gap-4 text-sm text-gray">
            <Link
              to={`/c/${post.communityName}/p/${encodeURIComponent(post.uri)}`}
              className="hover:text-secondary-blue transition-smooth"
            >
              {post.commentCount === 0
                ? "Add comment"
                : `${post.commentCount} comment${post.commentCount === 1 ? "" : "s"}`}
            </Link>
            <BookmarkButton
              postUri={post.uri}
              isBookmarked={true}
              isAuthenticated={true}
              size="small"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
