import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { useLoaderData, useActionData, Form, Link } from '@remix-run/react';
import { formatDistanceToNow } from 'date-fns';
import { requireAuth, optionalAuth } from '~/lib/auth/require-auth.server';
import { getCommunity } from '~/services/community.server';
import { getPost, listPosts, createPost } from '~/services/post.server';
import { createPostSchema } from '~/lib/validations/post';
import { VoteButtons } from '~/components/post/VoteButtons';
import { z } from 'zod';

export async function loader({ request, params }: LoaderFunctionArgs) {
  const auth = await optionalAuth(request);
  const communityName = params.communityName!;
  const postUri = decodeURIComponent(params.postUri!);

  // Get community
  const community = await getCommunity(communityName, auth?.user.id);
  if (!community) {
    throw new Response('Community not found', { status: 404 });
  }

  // Get post
  const post = await getPost(postUri, auth?.user.id);
  if (!post) {
    throw new Response('Post not found', { status: 404 });
  }

  // Verify post belongs to this community
  if (post.communityId !== community.id) {
    throw new Response('Post not found in this community', { status: 404 });
  }

  // Get comments (posts with this post as replyRoot)
  const comments = await listPosts(
    {
      replyRoot: postUri,
      limit: 100, // Load first 100 comments
      sortBy: 'new', // Most recent first
    },
    auth?.user.id
  );

  return json({
    post,
    comments,
    community,
    isAuthenticated: !!auth,
    currentUserId: auth?.user.id,
  });
}

export async function action({ request, params }: ActionFunctionArgs) {
  const auth = await requireAuth(request);
  const communityName = params.communityName!;
  const postUri = decodeURIComponent(params.postUri!);

  const formData = await request.formData();
  const intent = formData.get('intent');

  if (intent === 'comment') {
    const text = formData.get('text') as string;
    const replyParentUri = (formData.get('replyParent') as string) || postUri;

    // Validate comment
    try {
      createPostSchema.parse({
        text,
        communityId: 'placeholder', // Will be set from post's community
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return json({ error: error.errors[0].message }, { status: 400 });
      }
      return json({ error: 'Validation failed' }, { status: 400 });
    }

    // Get post to get community ID
    const post = await getPost(postUri, auth.user.id);
    if (!post) {
      return json({ error: 'Post not found' }, { status: 404 });
    }

    // Create comment
    try {
      await createPost(auth.user.id, auth.identity!.providerUserId, {
        communityId: post.communityId,
        text,
        replyTo: {
          root: postUri,
          parent: replyParentUri,
        },
      });

      // Redirect to refresh comments
      return redirect(`/c/${communityName}/p/${encodeURIComponent(postUri)}`);
    } catch (error) {
      console.error('Comment creation error:', error);
      return json(
        {
          error:
            error instanceof Error ? error.message : 'Failed to post comment',
        },
        { status: 500 }
      );
    }
  }

  return json({ error: 'Invalid intent' }, { status: 400 });
}

export default function PostDetail() {
  const { post, comments, community, isAuthenticated, currentUserId } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  // Format timestamp
  const timeAgo = formatDistanceToNow(new Date(post.createdAt), {
    addSuffix: true,
  });

  // Format author DID
  const authorDisplay = post.authorDid.startsWith('did:')
    ? post.authorDid.slice(0, 20) + '...'
    : post.authorDid;

  // Check if current user is author
  const isAuthor = currentUserId === post.authorDid;

  // Parse embed data if exists
  let embedImages: any[] = [];
  let embedExternal: any = null;
  if (post.embedData) {
    try {
      const embed = JSON.parse(post.embedData);
      if (post.embedType === 'images') {
        embedImages = embed.images || [];
      } else if (post.embedType === 'external') {
        embedExternal = embed;
      }
    } catch (e) {
      console.error('Failed to parse embed data:', e);
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back to community */}
      <div className="mb-4">
        <Link
          to={`/c/${community.name}`}
          className="text-secondary-blue hover:underline text-sm flex items-center gap-1"
        >
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
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to c/{community.name}
        </Link>
      </div>

      {/* Main Post */}
      <div className="card mb-6">
        <div className="flex gap-4">
          {/* Left: Votes */}
          <VoteButtons
            postUri={post.uri}
            voteCount={post.voteCount}
            userVote={post.userVote}
            isAuthenticated={isAuthenticated}
            size="large"
          />

          {/* Right: Content */}
          <div className="flex-1">
            {/* Title */}
            {post.title && (
              <h1 className="text-3xl font-serif font-bold mb-3">
                {post.title}
              </h1>
            )}

            {/* Metadata */}
            <div className="flex items-center gap-2 text-sm text-gray mb-4">
              <span title={post.authorDid}>{authorDisplay}</span>
              <span>•</span>
              <span>{timeAgo}</span>
              {isAuthor && (
                <>
                  <span>•</span>
                  <span className="text-primary font-semibold">You</span>
                </>
              )}
            </div>

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="flex gap-2 mb-4">
                {post.tags.map((tag: string) => (
                  <span
                    key={tag}
                    className="bg-gray-100 px-3 py-1 rounded text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Full Text Content */}
            <div className="prose prose-sm max-w-none mb-4">
              <p className="whitespace-pre-wrap break-words">{post.text}</p>
            </div>

            {/* Image Embed */}
            {embedImages.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mb-4">
                {embedImages.map((img: any, idx: number) => (
                  <div key={idx} className="rounded-lg overflow-hidden">
                    <img
                      src={img.url || img.ref?.$link}
                      alt={`Image ${idx + 1}`}
                      className="w-full h-auto"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* External Link Embed */}
            {embedExternal && (
              <a
                href={embedExternal.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-smooth mb-4"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">
                      {embedExternal.title}
                    </h3>
                    <p className="text-sm text-gray mb-2">
                      {embedExternal.description}
                    </p>
                    <p className="text-xs text-secondary-blue">
                      {embedExternal.url}
                    </p>
                  </div>
                  <svg
                    className="w-5 h-5 text-gray flex-shrink-0"
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
                </div>
              </a>
            )}

            {/* Post Actions */}
            <div className="flex items-center gap-4 text-sm text-gray pt-3 border-t border-gray-200">
              <span className="font-semibold">
                {comments.length} comment{comments.length === 1 ? '' : 's'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Comment Form */}
      {isAuthenticated && !post.isLocked && (
        <div className="card mb-6">
          <h3 className="font-semibold mb-3">Add a comment</h3>

          {actionData?.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-red-800 text-sm">{actionData.error}</p>
            </div>
          )}

          <Form method="post">
            <input type="hidden" name="intent" value="comment" />
            <input type="hidden" name="replyParent" value={post.uri} />

            <textarea
              name="text"
              rows={4}
              placeholder="What are your thoughts?"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary mb-3"
              required
            />

            <div className="flex justify-end">
              <button
                type="submit"
                className="bg-primary text-dark px-6 py-2 rounded-lg font-semibold hover:bg-primary-dark transition-smooth"
              >
                Comment
              </button>
            </div>
          </Form>
        </div>
      )}

      {post.isLocked && (
        <div className="card mb-6 text-center py-6 bg-gray-50">
          <p className="text-gray">
            This post has been locked. No new comments can be added.
          </p>
        </div>
      )}

      {/* Comments Section */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <div className="card text-center py-8">
            <p className="text-gray">
              No comments yet. Be the first to share your thoughts!
            </p>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-serif font-bold">Comments</h2>
            {comments.map((comment) => (
              <CommentCard
                key={comment.uri}
                comment={comment}
                postUri={post.uri}
                communityName={community.name}
                currentUserId={currentUserId}
                isAuthenticated={isAuthenticated}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Comment Card Component
 */
function CommentCard({
  comment,
  postUri,
  communityName,
  currentUserId,
  isAuthenticated,
}: {
  comment: any;
  postUri: string;
  communityName: string;
  currentUserId?: string;
  isAuthenticated: boolean;
}) {
  const timeAgo = formatDistanceToNow(new Date(comment.createdAt), {
    addSuffix: true,
  });

  const authorDisplay = comment.authorDid.startsWith('did:')
    ? comment.authorDid.slice(0, 20) + '...'
    : comment.authorDid;

  const isAuthor = currentUserId === comment.authorDid;

  // Determine nesting level (simple: direct reply vs nested)
  const isNested = comment.replyParent !== postUri;

  return (
    <div
      className={`card ${isNested ? 'ml-8 border-l-2 border-gray-200' : ''}`}
    >
      <div className="flex gap-4">
        {/* Left: Votes (smaller for comments) */}
        <VoteButtons
          postUri={comment.uri}
          voteCount={comment.voteCount}
          userVote={comment.userVote}
          isAuthenticated={isAuthenticated}
          size="small"
        />

        {/* Right: Content */}
        <div className="flex-1">
          {/* Author & Time */}
          <div className="flex items-center gap-2 text-sm text-gray mb-2">
            <span className="font-semibold" title={comment.authorDid}>
              {authorDisplay}
            </span>
            {isAuthor && (
              <span className="text-primary font-semibold text-xs">You</span>
            )}
            <span>•</span>
            <span>{timeAgo}</span>
          </div>

          {/* Comment Text */}
          <p className="text-gray whitespace-pre-wrap break-words mb-2">
            {comment.text}
          </p>

          {/* Comment Actions */}
          <div className="flex items-center gap-3 text-sm">
            <button className="text-gray hover:text-secondary-blue transition-smooth">
              Reply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
