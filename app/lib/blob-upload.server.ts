import { BlobRef } from "@atproto/api";
import type { Agent } from "@atproto/api";
import { uploadBlob } from "./atproto.server";

/**
 * Image validation and upload utilities for ATProto blobs
 */

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_AVATAR_SIZE = 1_000_000; // 1MB
const MAX_BANNER_SIZE = 3_000_000; // 3MB

export interface ImageValidationOptions {
  maxSize: number;
  allowedTypes?: string[];
}

/**
 * Validate image data
 */
export function validateImage(
  data: Uint8Array,
  mimeType: string,
  options: ImageValidationOptions
): { valid: boolean; error?: string } {
  // Check file type
  const allowedTypes = options.allowedTypes || ALLOWED_IMAGE_TYPES;
  if (!allowedTypes.includes(mimeType)) {
    return {
      valid: false,
      error: `Invalid image type. Allowed types: ${allowedTypes.join(", ")}`,
    };
  }

  // Check file size
  if (data.byteLength > options.maxSize) {
    const maxSizeMB = (options.maxSize / 1_000_000).toFixed(1);
    return {
      valid: false,
      error: `Image too large. Maximum size: ${maxSizeMB}MB`,
    };
  }

  return { valid: true };
}

/**
 * Upload and validate an avatar image
 */
export async function uploadAvatar(
  agent: Agent,
  data: Uint8Array,
  mimeType: string
): Promise<{ blob: BlobRef; error?: string }> {
  // Validate
  const validation = validateImage(data, mimeType, {
    maxSize: MAX_AVATAR_SIZE,
  });

  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Upload
  const blob = await uploadBlob(agent, data, mimeType);

  return { blob };
}

/**
 * Upload and validate a banner image
 */
export async function uploadBanner(
  agent: Agent,
  data: Uint8Array,
  mimeType: string
): Promise<{ blob: BlobRef; error?: string }> {
  // Validate
  const validation = validateImage(data, mimeType, {
    maxSize: MAX_BANNER_SIZE,
  });

  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Upload
  const blob = await uploadBlob(agent, data, mimeType);

  return { blob };
}

/**
 * Process uploaded file from form data
 * Converts File to Uint8Array for upload
 */
export async function processUploadedFile(
  file: File
): Promise<{ data: Uint8Array; mimeType: string }> {
  const arrayBuffer = await file.arrayBuffer();
  const data = new Uint8Array(arrayBuffer);
  const mimeType = file.type;

  return { data, mimeType };
}

/**
 * Upload community images (avatar and/or banner)
 */
export async function uploadCommunityImages(
  agent: Agent,
  options: {
    avatar?: File;
    banner?: File;
  }
): Promise<{
  avatarBlob?: BlobRef;
  bannerBlob?: BlobRef;
  errors: string[];
}> {
  const errors: string[] = [];
  let avatarBlob: BlobRef | undefined;
  let bannerBlob: BlobRef | undefined;

  // Upload avatar if provided
  if (options.avatar) {
    try {
      const { data, mimeType } = await processUploadedFile(options.avatar);
      const result = await uploadAvatar(agent, data, mimeType);
      avatarBlob = result.blob;
    } catch (error) {
      errors.push(
        `Avatar upload failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  // Upload banner if provided
  if (options.banner) {
    try {
      const { data, mimeType } = await processUploadedFile(options.banner);
      const result = await uploadBanner(agent, data, mimeType);
      bannerBlob = result.blob;
    } catch (error) {
      errors.push(
        `Banner upload failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  return { avatarBlob, bannerBlob, errors };
}
