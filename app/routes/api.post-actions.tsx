import type { ActionFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { requireAuth } from '~/lib/auth/require-auth.server';
import { updatePost, deletePost, getPost } from '~/services/post.server';
import { isUserModerator, getUserModeratorRole } from '~/lib/db/moderators.server';
import * as postDb from '~/lib/db/posts.server';
import { z } from 'zod';

// Validation schemas
const updatePostSchema = z.object({
  postUri: z.string().min(1, 'Post URI is required'),
  title: z.string().max(300, 'Title must be 300 characters or less').optional(),
  text: z.string().min(1, 'Text is required').max(40000, 'Text must be 40000 characters or less'),
});

const deletePostSchema = z.object({
  postUri: z.string().min(1, 'Post URI is required'),
});

const moderatorActionSchema = z.object({
  postUri: z.string().min(1, 'Post URI is required'),
  action: z.enum(['pin', 'unpin', 'lock', 'unlock', 'remove', 'restore']),
});

export async function action({ request }: ActionFunctionArgs) {
  const auth = await requireAuth(request);

  const formData = await request.formData();
  const intent = formData.get('intent') as string;

  try {
    switch (intent) {
      case 'edit': {
        // Parse and validate input
        const input = updatePostSchema.parse({
          postUri: formData.get('postUri'),
          title: formData.get('title') || undefined,
          text: formData.get('text'),
        });

        // Update the post
        const updated = await updatePost(
          input.postUri,
          auth.user.id,
          auth.identity!.providerUserId,
          {
            title: input.title,
            text: input.text,
          }
        );

        return json({
          success: true,
          post: updated,
        });
      }

      case 'delete': {
        // Parse and validate input
        const input = deletePostSchema.parse({
          postUri: formData.get('postUri'),
        });

        // Delete the post
        await deletePost(input.postUri, auth.user.id, auth.identity!.providerUserId);

        return json({
          success: true,
          deleted: true,
        });
      }

      case 'moderator': {
        // Parse and validate input
        const input = moderatorActionSchema.parse({
          postUri: formData.get('postUri'),
          action: formData.get('action'),
        });

        // Get the post to check community
        const post = await getPost(input.postUri, auth.user.id);
        if (!post) {
          return json({ error: 'Post not found' }, { status: 404 });
        }

        // Check moderator permissions
        const modRole = await getUserModeratorRole(auth.user.id, post.communityId);
        if (!modRole) {
          return json({ error: 'You are not a moderator of this community' }, { status: 403 });
        }

        // Perform the action
        let updateData: Record<string, boolean> = {};
        switch (input.action) {
          case 'pin':
            updateData = { isPinned: true };
            break;
          case 'unpin':
            updateData = { isPinned: false };
            break;
          case 'lock':
            updateData = { isLocked: true };
            break;
          case 'unlock':
            updateData = { isLocked: false };
            break;
          case 'remove':
            updateData = { isRemoved: true };
            break;
          case 'restore':
            updateData = { isRemoved: false };
            break;
        }

        await postDb.updatePost(input.postUri, updateData);

        return json({
          success: true,
          action: input.action,
        });
      }

      default:
        return json({ error: 'Invalid intent' }, { status: 400 });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error('Post action error:', error);
    return json(
      { error: error instanceof Error ? error.message : 'Failed to perform action' },
      { status: 500 }
    );
  }
}
