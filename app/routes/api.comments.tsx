import type { LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { optionalAuth } from '~/lib/auth/require-auth.server';
import { listPosts } from '~/services/post.server';

/**
 * API endpoint for loading paginated comments
 *
 * Query params:
 * - postUri: The root post URI to get comments for
 * - offset: Number of comments to skip (default 0)
 * - limit: Number of comments to return (default 20)
 * - sortBy: Sort order (default 'new')
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const auth = await optionalAuth(request);
  const url = new URL(request.url);

  const postUri = url.searchParams.get('postUri');
  const offset = parseInt(url.searchParams.get('offset') || '0');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 50); // Max 50
  const sortBy = (url.searchParams.get('sortBy') || 'new') as 'hot' | 'new' | 'top';

  if (!postUri) {
    return json({ error: 'postUri is required' }, { status: 400 });
  }

  try {
    const comments = await listPosts(
      {
        replyRoot: postUri,
        limit: limit + 1, // Fetch one extra to check if more exist
        offset,
        sortBy,
      },
      auth?.user.id
    );

    // Check if there are more comments
    const hasMore = comments.length > limit;
    const displayComments = hasMore ? comments.slice(0, limit) : comments;

    return json({
      comments: displayComments,
      hasMore,
      nextOffset: offset + displayComments.length,
    });
  } catch (error) {
    console.error('Error loading comments:', error);
    return json(
      { error: error instanceof Error ? error.message : 'Failed to load comments' },
      { status: 500 }
    );
  }
}
