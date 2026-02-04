import { z } from 'zod';

/**
 * Schema for creating a new post
 */
export const createPostSchema = z.object({
  title: z
    .string()
    .max(300, 'Title must be at most 300 characters')
    .optional(),
  text: z
    .string()
    .min(1, 'Post content is required')
    .max(10000, 'Post content must be at most 10,000 characters'),
  communityId: z.string().uuid('Invalid community ID'),
  tags: z
    .array(z.string().max(50, 'Tag must be at most 50 characters'))
    .max(8, 'Maximum 8 tags allowed')
    .optional(),
  // Reply threading
  replyRootUri: z.string().optional(),
  replyParentUri: z.string().optional(),
});

/**
 * Schema for updating a post
 */
export const updatePostSchema = z.object({
  title: z
    .string()
    .max(300, 'Title must be at most 300 characters')
    .optional(),
  text: z
    .string()
    .min(1, 'Post content is required')
    .max(10000, 'Post content must be at most 10,000 characters')
    .optional(),
}).refine(
  (data) => data.title !== undefined || data.text !== undefined,
  'At least one field must be provided for update'
);

/**
 * Schema for voting
 */
export const voteSchema = z.object({
  direction: z.enum(['up', 'down'], {
    errorMap: () => ({ message: 'Direction must be either "up" or "down"' }),
  }),
});

/**
 * Schema for external link embed
 */
export const externalLinkSchema = z.object({
  url: z.string().url('Invalid URL'),
  title: z.string().min(1).max(300),
  description: z.string().max(1000),
});

// File upload limits
export const MAX_POST_IMAGES = 4;
export const MAX_IMAGE_SIZE = 5_000_000; // 5MB per image
export const MAX_THUMB_SIZE = 1_000_000; // 1MB for link thumbnail
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Validate image file
 */
export function validateImageFile(file: File, maxSize: number = MAX_IMAGE_SIZE): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return 'Image must be JPEG, PNG, or WebP format';
  }

  if (file.size > maxSize) {
    const maxMB = maxSize / 1_000_000;
    return `Image must be less than ${maxMB}MB`;
  }

  return null;
}
