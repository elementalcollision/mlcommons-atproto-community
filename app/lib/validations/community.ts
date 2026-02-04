import { z } from "zod";

// Match Lexicon: 3-21 chars, lowercase alphanumeric and hyphens
export const communityNameSchema = z
  .string()
  .min(3, "Name must be at least 3 characters")
  .max(21, "Name must be at most 21 characters")
  .regex(
    /^[a-z0-9-]+$/,
    "Name can only contain lowercase letters, numbers, and hyphens"
  )
  .regex(/^[a-z]/, "Name must start with a letter")
  .regex(/[a-z0-9]$/, "Name must end with a letter or number");

export const createCommunitySchema = z.object({
  name: communityNameSchema,
  displayName: z
    .string()
    .min(1, "Display name is required")
    .max(64, "Display name must be at most 64 characters"),
  description: z
    .string()
    .max(3000, "Description must be at most 3000 characters")
    .optional(),
  visibility: z.enum(["public", "unlisted", "private"]),
  postPermissions: z.enum(["anyone", "approved", "moderators"]),
});

export const updateCommunitySchema = z.object({
  displayName: z
    .string()
    .min(1, "Display name is required")
    .max(64, "Display name must be at most 64 characters")
    .optional(),
  description: z
    .string()
    .max(3000, "Description must be at most 3000 characters")
    .optional(),
  visibility: z.enum(["public", "unlisted", "private"]).optional(),
  postPermissions: z.enum(["anyone", "approved", "moderators"]).optional(),
});

// File validation (for multipart form data)
export const MAX_AVATAR_SIZE = 1_000_000; // 1MB
export const MAX_BANNER_SIZE = 3_000_000; // 3MB
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
