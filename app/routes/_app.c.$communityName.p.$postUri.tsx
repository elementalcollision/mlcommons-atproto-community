import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { useLoaderData, useActionData, Form, Link, useNavigate, useFetcher } from '@remix-run/react';
import { formatDistanceToNow } from 'date-fns';
import { useState, useEffect } from 'react';
import { requireAuth, optionalAuth } from '~/lib/auth/require-auth.server';
import { getCommunity } from '~/services/community.server';
import { getPost, listPosts, createPost } from '~/services/post.server';
import { createPostSchema } from '~/lib/validations/post';
import { VoteButtons } from '~/components/post/VoteButtons';
import { PostHeader } from '~/components/post/PostHeader';
import { PostActionMenu } from '~/components/post/PostActionMenu';
import { ConfirmDialog } from '~/components/ui/ConfirmDialog';
import { getUserModeratorRole } from '~/lib/db/moderators.server';
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

  // Get comments (posts with this post as replyRoot) - paginated
  const commentsLimit = 20;
  const allComments = await listPosts(
    {
      replyRoot: postUri,
      limit: commentsLimit + 1, // Fetch one extra to check if more exist
      sortBy: 'new', // Most recent first
    },
    auth?.user.id
  );

  // Check if there are more comments
  const hasMoreComments = allComments.length > commentsLimit;
  const comments = hasMoreComments ? allComments.slice(0, commentsLimit) : allComments;

  // Check moderator status
  let moderatorRole: 'admin' | 'moderator' | null = null;
  if (auth?.user.id) {
    moderatorRole = await getUserModeratorRole(auth.user.id, community.id);
  }

  return json({
    post,
    comments,
    community,
    isAuthenticated: !!auth,
    currentUserId: auth?.user.id,
    moderatorRole,
    hasMoreComments,
    totalCommentCount: post.commentCount,
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
  const { post, comments: initialComments, community, isAuthenticated, currentUserId, moderatorRole, hasMoreComments: initialHasMore, totalCommentCount } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigate = useNavigate();
  const fetcher = useFetcher();
  const commentsFetcher = useFetcher();

  // Edit/Delete state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(post.title || '');
  const [editText, setEditText] = useState(post.text);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Comments pagination state
  const [displayedComments, setDisplayedComments] = useState(initialComments);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [nextOffset, setNextOffset] = useState(initialComments.length);

  // Reset comments when initial data changes (e.g., after adding a comment)
  useEffect(() => {
    setDisplayedComments(initialComments);
    setHasMore(initialHasMore);
    setNextOffset(initialComments.length);
  }, [initialComments, initialHasMore]);

  // Handle load more response
  useEffect(() => {
    const data = commentsFetcher.data as { comments?: any[]; hasMore?: boolean; nextOffset?: number } | undefined;
    if (data?.comments) {
      setDisplayedComments(prev => [...prev, ...data.comments]);
      setHasMore(data.hasMore ?? false);
      setNextOffset(data.nextOffset ?? nextOffset);
    }
  }, [commentsFetcher.data]);

  // Load more comments handler
  const loadMoreComments = () => {
    commentsFetcher.load(`/api/comments?postUri=${encodeURIComponent(post.uri)}&offset=${nextOffset}&limit=20&sortBy=new`);
  };

  const isLoadingMore = commentsFetcher.state === 'loading';

  // Handle fetcher responses
  useEffect(() => {
    const data = fetcher.data as { success?: boolean; deleted?: boolean; post?: unknown; error?: string } | undefined;
    if (data) {
      if (data.success) {
        if (data.deleted) {
          // Post deleted, navigate back to community
          navigate(`/c/${community.name}`);
        } else if (data.post) {
          // Post edited, close edit mode
          setIsEditing(false);
          setActionError(null);
        }
      } else if (data.error) {
        setActionError(data.error);
      }
    }
  }, [fetcher.data, community.name, navigate]);

  // Check if current user is author
  const isAuthor = currentUserId === post.authorDid;
  const isModerator = !!moderatorRole;

  // Handle edit
  const handleEdit = () => {
    setEditTitle(post.title || '');
    setEditText(post.text);
    setIsEditing(true);
    setActionError(null);
  };

  const handleSaveEdit = () => {
    fetcher.submit(
      {
        intent: 'edit',
        postUri: post.uri,
        title: editTitle,
        text: editText,
      },
      { method: 'POST', action: '/api/post-actions' }
    );
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditTitle(post.title || '');
    setEditText(post.text);
    setActionError(null);
  };

  // Handle delete
  const handleDelete = () => {
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = () => {
    fetcher.submit(
      {
        intent: 'delete',
        postUri: post.uri,
      },
      { method: 'POST', action: '/api/post-actions' }
    );
    setShowDeleteDialog(false);
  };

  // Moderator actions
  const handleModeratorAction = (action: string) => {
    fetcher.submit(
      {
        intent: 'moderator',
        postUri: post.uri,
        action,
      },
      { method: 'POST', action: '/api/post-actions' }
    );
  };

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

  const isSubmitting = fetcher.state === 'submitting';

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

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Post"
        message="Are you sure you want to delete this post? This action cannot be undone. All comments will also be removed."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={isSubmitting}
      />

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
            {/* Status Indicators */}
            {(post.isPinned || post.isLocked || post.isRemoved) && (
              <div className="flex flex-wrap gap-2 mb-3">
                {post.isPinned && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                    Pinned
                  </span>
                )}
                {post.isLocked && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Locked
                  </span>
                )}
                {post.isRemoved && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                    Removed
                  </span>
                )}
              </div>
            )}

            {/* Header with Action Menu */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                {/* Title - Editable or Display */}
                {isEditing ? (
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Title (optional)"
                    className="w-full text-2xl font-serif font-bold px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary mb-2"
                    maxLength={300}
                  />
                ) : (
                  post.title && (
                    <h1 className="text-3xl font-serif font-bold">
                      {post.title}
                    </h1>
                  )
                )}
              </div>

              {/* Action Menu */}
              <PostActionMenu
                postUri={post.uri}
                isAuthor={isAuthor}
                isModerator={isModerator}
                isPinned={post.isPinned}
                isLocked={post.isLocked}
                isRemoved={post.isRemoved}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onPin={() => handleModeratorAction('pin')}
                onUnpin={() => handleModeratorAction('unpin')}
                onLock={() => handleModeratorAction('lock')}
                onUnlock={() => handleModeratorAction('unlock')}
                onRemove={() => handleModeratorAction('remove')}
                onRestore={() => handleModeratorAction('restore')}
              />
            </div>

            {/* Author & Metadata */}
            <div className="mb-4">
              <PostHeader
                authorDid={post.authorDid}
                createdAt={post.createdAt}
                showAvatar={true}
                size="medium"
              />
              {isAuthor && (
                <span className="ml-2 text-primary font-semibold text-sm">
                  (You)
                </span>
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

            {/* Action Error */}
            {actionError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-red-800 text-sm">{actionError}</p>
              </div>
            )}

            {/* Full Text Content - Editable or Display */}
            {isEditing ? (
              <div className="mb-4">
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  rows={8}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Post content..."
                  required
                />
                <div className="flex items-center justify-end gap-3 mt-3">
                  <button
                    onClick={handleCancelEdit}
                    disabled={isSubmitting}
                    className="px-4 py-2 text-gray hover:text-dark transition-smooth disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={isSubmitting || !editText.trim()}
                    className="px-6 py-2 bg-primary text-dark rounded-lg font-semibold hover:bg-primary-dark transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="prose prose-sm max-w-none mb-4">
                <p className="whitespace-pre-wrap break-words">{post.text}</p>
              </div>
            )}

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
                {totalCommentCount} comment{totalCommentCount === 1 ? '' : 's'}
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
        {displayedComments.length === 0 ? (
          <div className="card text-center py-8">
            <p className="text-gray">
              No comments yet. Be the first to share your thoughts!
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-serif font-bold">Comments</h2>
              {totalCommentCount > displayedComments.length && (
                <span className="text-sm text-gray">
                  Showing {displayedComments.length} of {totalCommentCount}
                </span>
              )}
            </div>
            {displayedComments.map((comment) => (
              <CommentCard
                key={comment.uri}
                comment={comment}
                postUri={post.uri}
                communityName={community.name}
                currentUserId={currentUserId}
                isAuthenticated={isAuthenticated}
                isPostLocked={post.isLocked}
              />
            ))}

            {/* Load More Button */}
            {hasMore && (
              <div className="text-center py-4">
                <button
                  onClick={loadMoreComments}
                  disabled={isLoadingMore}
                  className="px-6 py-2 bg-gray-100 text-dark rounded-lg font-semibold hover:bg-gray-200 transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoadingMore ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Loading...
                    </span>
                  ) : (
                    'Load more comments'
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Comment Card Component with inline reply functionality
 */
function CommentCard({
  comment,
  postUri,
  communityName,
  currentUserId,
  isAuthenticated,
  isPostLocked,
}: {
  comment: any;
  postUri: string;
  communityName: string;
  currentUserId?: string;
  isAuthenticated: boolean;
  isPostLocked?: boolean;
}) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState('');
  const replyFetcher = useFetcher();

  const isAuthor = currentUserId === comment.authorDid;

  // Determine nesting level (simple: direct reply vs nested)
  const isNested = comment.replyParent !== postUri;

  // Check if reply is submitting
  const isSubmittingReply = replyFetcher.state === 'submitting';

  // Handle successful reply submission - close form and clear text
  useEffect(() => {
    if (replyFetcher.state === 'idle' && replyFetcher.data === undefined && showReplyForm && replyText === '') {
      // Form was just reset after navigation/redirect
    }
  }, [replyFetcher.state, replyFetcher.data, showReplyForm, replyText]);

  const handleReplySubmit = () => {
    if (!replyText.trim()) return;

    replyFetcher.submit(
      {
        intent: 'comment',
        text: replyText,
        replyParent: comment.uri, // Reply to this comment, not the post
      },
      { method: 'POST' }
    );

    // Clear form after submission (page will redirect and refresh)
    setReplyText('');
    setShowReplyForm(false);
  };

  const handleCancelReply = () => {
    setReplyText('');
    setShowReplyForm(false);
  };

  // Don't allow replies if post is locked or not authenticated
  const canReply = isAuthenticated && !isPostLocked;

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
          <div className="mb-2">
            <PostHeader
              authorDid={comment.authorDid}
              createdAt={comment.createdAt}
              size="small"
            />
            {isAuthor && (
              <span className="ml-2 text-primary font-semibold text-xs">
                (You)
              </span>
            )}
          </div>

          {/* Comment Text */}
          <p className="text-gray whitespace-pre-wrap break-words mb-2">
            {comment.text}
          </p>

          {/* Comment Actions */}
          <div className="flex items-center gap-3 text-sm">
            {canReply && (
              <button
                onClick={() => setShowReplyForm(!showReplyForm)}
                className="text-gray hover:text-secondary-blue transition-smooth"
              >
                {showReplyForm ? 'Cancel' : 'Reply'}
              </button>
            )}
          </div>

          {/* Inline Reply Form */}
          {showReplyForm && (
            <div className="mt-3 pl-2 border-l-2 border-primary">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={3}
                placeholder="Write a reply..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary mb-2"
                disabled={isSubmittingReply}
                autoFocus
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCancelReply}
                  disabled={isSubmittingReply}
                  className="px-3 py-1 text-sm text-gray hover:text-dark transition-smooth disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleReplySubmit}
                  disabled={isSubmittingReply || !replyText.trim()}
                  className="px-4 py-1 text-sm bg-primary text-dark rounded-lg font-semibold hover:bg-primary-dark transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmittingReply ? 'Posting...' : 'Reply'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
