import { v4 as uuid } from "uuid";
import {
  getAgentForUser,
  createCommunityRecord,
  updateCommunityRecord,
  deleteCommunityRecord,
} from "~/lib/atproto.server";
import { uploadCommunityImages } from "~/lib/blob-upload.server";
import * as communityDb from "~/lib/db/communities.server";
import type {
  CreateCommunityInput,
  UpdateCommunityInput,
  CommunityWithStats,
} from "~/types/community";

/**
 * Create a new community
 * 1. Validate input
 * 2. Check name availability
 * 3. Upload images to ATProto (if provided)
 * 4. Create ATProto record
 * 5. Store in database
 * 6. Subscribe creator to community
 */
export async function createCommunity(
  userId: string,
  userDid: string,
  input: CreateCommunityInput
): Promise<CommunityWithStats> {
  // Check if name is already taken
  const existing = await communityDb.findCommunityByName(input.name);
  if (existing) {
    throw new Error("Community name is already taken");
  }

  // Get authenticated agent
  const agent = await getAgentForUser(userDid);
  if (!agent) {
    throw new Error("Failed to authenticate with ATProto");
  }

  // Upload images (if provided)
  const { avatarBlob, bannerBlob, errors } = await uploadCommunityImages(
    agent,
    {
      avatar: input.avatar,
      banner: input.banner,
    }
  );

  if (errors.length > 0) {
    throw new Error(`Image upload failed: ${errors.join(", ")}`);
  }

  // Create ATProto record
  const { uri, cid, rkey } = await createCommunityRecord(agent, userDid, {
    name: input.name,
    displayName: input.displayName,
    description: input.description,
    avatar: avatarBlob,
    banner: bannerBlob,
    visibility: input.visibility,
    postPermissions: input.postPermissions,
  });

  // Store in database
  const community = await communityDb.insertCommunity({
    id: uuid(),
    creatorDid: userId,
    name: input.name,
    displayName: input.displayName,
    description: input.description || null,
    avatar: avatarBlob ? JSON.stringify(avatarBlob) : null,
    banner: bannerBlob ? JSON.stringify(bannerBlob) : null,
    visibility: input.visibility,
    postPermissions: input.postPermissions,
    atprotoUri: uri,
    atprotoCid: cid,
    atprotoRkey: rkey,
    memberCount: 1, // Creator is first member
    postCount: 0,
  });

  // Subscribe creator to the community
  await communityDb.subscribeUserToCommunity(userId, community.id);

  return {
    ...community,
    memberCount: 1,
    postCount: 0,
    isSubscribed: true,
  };
}

/**
 * Get community by name with stats
 */
export async function getCommunity(
  name: string,
  userId?: string
): Promise<CommunityWithStats | null> {
  return await communityDb.getCommunityWithStats(name, userId);
}

/**
 * Update community metadata
 */
export async function updateCommunity(
  communityId: string,
  userId: string,
  userDid: string,
  input: UpdateCommunityInput
): Promise<CommunityWithStats> {
  // Get existing community
  const community = await communityDb.findCommunityById(communityId);
  if (!community) {
    throw new Error("Community not found");
  }

  // Check permissions (only creator can update)
  if (community.creatorDid !== userId) {
    throw new Error("Only the community creator can update it");
  }

  // Get authenticated agent
  const agent = await getAgentForUser(userDid);
  if (!agent) {
    throw new Error("Failed to authenticate with ATProto");
  }

  // Upload new images (if provided)
  let avatarBlob = community.avatar ? JSON.parse(community.avatar) : undefined;
  let bannerBlob = community.banner ? JSON.parse(community.banner) : undefined;

  if (input.avatar || input.banner) {
    const { avatarBlob: newAvatar, bannerBlob: newBanner, errors } =
      await uploadCommunityImages(agent, {
        avatar: input.avatar,
        banner: input.banner,
      });

    if (errors.length > 0) {
      throw new Error(`Image upload failed: ${errors.join(", ")}`);
    }

    if (newAvatar) avatarBlob = newAvatar;
    if (newBanner) bannerBlob = newBanner;
  }

  // Update ATProto record
  const { uri, cid } = await updateCommunityRecord(
    agent,
    userDid,
    community.atprotoRkey!,
    {
      name: community.name,
      displayName: input.displayName || community.displayName,
      description:
        input.description !== undefined
          ? input.description
          : community.description || undefined,
      avatar: avatarBlob,
      banner: bannerBlob,
      visibility: input.visibility || community.visibility,
      postPermissions: input.postPermissions || community.postPermissions,
      createdAt: community.createdAt.toISOString(),
    }
  );

  // Update database
  const updated = await communityDb.updateCommunity(communityId, {
    displayName: input.displayName,
    description: input.description !== undefined ? input.description : undefined,
    avatar: avatarBlob ? JSON.stringify(avatarBlob) : undefined,
    banner: bannerBlob ? JSON.stringify(bannerBlob) : undefined,
    visibility: input.visibility,
    postPermissions: input.postPermissions,
    atprotoUri: uri,
    atprotoCid: cid,
  });

  return {
    ...updated,
    memberCount: updated.memberCount || 0,
    postCount: updated.postCount || 0,
  };
}

/**
 * Delete community
 */
export async function deleteCommunity(
  communityId: string,
  userId: string,
  userDid: string
): Promise<void> {
  // Get existing community
  const community = await communityDb.findCommunityById(communityId);
  if (!community) {
    throw new Error("Community not found");
  }

  // Check permissions
  if (community.creatorDid !== userId) {
    throw new Error("Only the community creator can delete it");
  }

  // Get authenticated agent
  const agent = await getAgentForUser(userDid);
  if (!agent) {
    throw new Error("Failed to authenticate with ATProto");
  }

  // Delete ATProto record
  if (community.atprotoRkey) {
    await deleteCommunityRecord(agent, userDid, community.atprotoRkey);
  }

  // Delete from database (cascades to subscriptions)
  await communityDb.deleteCommunity(communityId);
}

/**
 * List communities with optional filtering
 */
export async function listCommunities(
  options: Parameters<typeof communityDb.listCommunities>[0] = {},
  userId?: string
): Promise<CommunityWithStats[]> {
  return await communityDb.listCommunities(options, userId);
}

/**
 * Subscribe to community
 */
export async function subscribeToCommunity(
  userId: string,
  communityId: string
): Promise<void> {
  // Check if already subscribed
  const isSubscribed = await communityDb.isUserSubscribed(userId, communityId);
  if (isSubscribed) {
    throw new Error("Already subscribed to this community");
  }

  await communityDb.subscribeUserToCommunity(userId, communityId);
}

/**
 * Unsubscribe from community
 */
export async function unsubscribeFromCommunity(
  userId: string,
  communityId: string
): Promise<void> {
  // Check if subscribed
  const isSubscribed = await communityDb.isUserSubscribed(userId, communityId);
  if (!isSubscribed) {
    throw new Error("Not subscribed to this community");
  }

  await communityDb.unsubscribeUserFromCommunity(userId, communityId);
}

/**
 * Get user's subscribed communities
 */
export async function getUserCommunities(
  userId: string
): Promise<CommunityWithStats[]> {
  return await communityDb.getUserCommunities(userId);
}
