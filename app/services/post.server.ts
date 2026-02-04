import { TID } from '@atproto/common';
import { getAgentForUser } from '~/lib/atproto.server';
import { uploadPostImages } from '~/lib/blob-upload.server';
import * as postDb from '~/lib/db/posts.server';
import * as communityDb from '~/lib/db/communities.server';
import type {
  CreatePostInput,
  UpdatePostInput,
  PostWithVotes,
  ListPostsOptions,
} from '~/types/post';
import type { BlobRef } from '@atproto/api';

/**
 * Create a new post
 * 1. Validate community exists and check permissions
 * 2. Upload images to ATProto (if provided)
 * 3. Create ATProto record
 * 4. Store in database
 * 5. Update community post count
 * 6. If reply, update parent comment count
 */
export async function createPost(
  userId: string,
  userDid: string,
  input: CreatePostInput
): Promise<PostWithVotes> {
  // Get community and check permissions
  const community = await communityDb.findCommunityById(input.communityId);
  if (!community) {
    throw new Error('Community not found');
  }

  // Check post permissions
  if (community.postPermissions === 'moderators') {
    // TODO: Check if user is moderator
    // For now, allow only creator
    if (community.creatorDid !== userId) {
      throw new Error('Only moderators can post in this community');
    }
  } else if (community.postPermissions === 'approved') {
    // TODO: Check if user is approved/member
    const isSubscribed = await communityDb.isUserSubscribed(
      userId,
      input.communityId
    );
    if (!isSubscribed && community.creatorDid !== userId) {
      throw new Error('Only community members can post here');
    }
  }

  // Get authenticated agent
  const agent = await getAgentForUser(userDid);
  if (!agent) {
    throw new Error('Failed to authenticate with ATProto');
  }

  // Handle images if provided
  let imageBlobs: BlobRef[] = [];
  if (input.images && input.images.length > 0) {
    const { blobs, errors } = await uploadPostImages(agent, input.images);
    if (errors.length > 0) {
      throw new Error(`Image upload failed: ${errors.join(', ')}`);
    }
    imageBlobs = blobs;
  }

  // Build embed data
  let embedType: string | null = null;
  let embedData: string | null = null;

  if (imageBlobs.length > 0) {
    embedType = 'images';
    embedData = JSON.stringify({ images: imageBlobs });
  } else if (input.externalLink) {
    embedType = 'external';
    embedData = JSON.stringify(input.externalLink);
  }

  // Generate rkey (TID for time-based ordering)
  const rkey = TID.nextStr();

  // Build ATProto record
  const record = {
    $type: 'mlcommons.community.post',
    text: input.text,
    title: input.title,
    communityRef: community.atprotoUri!,
    embed: embedType && embedData ? { type: embedType, data: JSON.parse(embedData) } : undefined,
    tags: input.tags,
    reply: input.replyTo,
    createdAt: new Date().toISOString(),
  };

  // Create ATProto record
  const result = await agent.com.atproto.repo.createRecord({
    repo: userDid,
    collection: 'mlcommons.community.post',
    rkey,
    record,
  });

  // Store in database
  const post = await postDb.insertPost({
    uri: result.data.uri,
    rkey,
    cid: result.data.cid,
    authorDid: userId,
    communityId: input.communityId,
    title: input.title || null,
    text: input.text,
    embedType,
    embedData,
    tags: input.tags || null,
    lang: 'en', // TODO: Detect language
    replyParent: input.replyTo?.parent || null,
    replyRoot: input.replyTo?.root || null,
    voteCount: 0,
    commentCount: 0,
    hotScore: 0,
    isRemoved: false,
    isPinned: false,
    isLocked: false,
    createdAt: new Date(),
    indexedAt: new Date(),
  });

  // Calculate initial hot score
  await postDb.recalculateHotScore(post.uri);

  // Update community post count (if top-level post, not a comment)
  if (!input.replyTo) {
    await communityDb.updateCommunity(input.communityId, {
      postCount: community.postCount! + 1,
    });
  }

  // If this is a reply, increment parent's comment count
  if (input.replyTo?.parent) {
    await postDb.incrementCommentCount(input.replyTo.parent);
  }

  return {
    ...post,
    voteCount: 0,
    userVote: null,
    isUpvoted: false,
    isDownvoted: false,
  };
}

/**
 * Get post by URI with vote information
 */
export async function getPost(
  uri: string,
  userId?: string
): Promise<PostWithVotes | null> {
  return await postDb.getPostWithVotes(uri, userId);
}

/**
 * List posts with optional filtering
 */
export async function listPosts(
  options: ListPostsOptions = {},
  userId?: string
): Promise<PostWithVotes[]> {
  return await postDb.listPosts(options, userId);
}

/**
 * Update post content
 */
export async function updatePost(
  postUri: string,
  userId: string,
  userDid: string,
  input: UpdatePostInput
): Promise<PostWithVotes> {
  // Get existing post
  const post = await postDb.findPostByUri(postUri);
  if (!post) {
    throw new Error('Post not found');
  }

  // Check permissions (only author can update)
  if (post.authorDid !== userId) {
    throw new Error('Only the post author can update it');
  }

  // Get authenticated agent
  const agent = await getAgentForUser(userDid);
  if (!agent) {
    throw new Error('Failed to authenticate with ATProto');
  }

  // Build updated record (merge with existing data)
  const community = await communityDb.findCommunityById(post.communityId);
  const record = {
    $type: 'mlcommons.community.post',
    text: input.text || post.text,
    title: input.title !== undefined ? input.title : post.title,
    communityRef: community!.atprotoUri!,
    embed: post.embedData ? JSON.parse(post.embedData) : undefined,
    tags: post.tags || undefined,
    reply: post.replyRoot
      ? { root: post.replyRoot, parent: post.replyParent! }
      : undefined,
    createdAt: post.createdAt.toISOString(),
  };

  // Update ATProto record
  await agent.com.atproto.repo.putRecord({
    repo: userDid,
    collection: 'mlcommons.community.post',
    rkey: post.rkey,
    record,
  });

  // Update database
  const updated = await postDb.updatePost(postUri, {
    title: input.title !== undefined ? input.title : undefined,
    text: input.text,
  });

  return {
    ...updated,
    voteCount: updated.voteCount || 0,
    userVote: null,
    isUpvoted: false,
    isDownvoted: false,
  };
}

/**
 * Delete post
 */
export async function deletePost(
  postUri: string,
  userId: string,
  userDid: string
): Promise<void> {
  // Get existing post
  const post = await postDb.findPostByUri(postUri);
  if (!post) {
    throw new Error('Post not found');
  }

  // Check permissions (only author can delete)
  if (post.authorDid !== userId) {
    throw new Error('Only the post author can delete it');
  }

  // Get authenticated agent
  const agent = await getAgentForUser(userDid);
  if (!agent) {
    throw new Error('Failed to authenticate with ATProto');
  }

  // Delete ATProto record
  await agent.com.atproto.repo.deleteRecord({
    repo: userDid,
    collection: 'mlcommons.community.post',
    rkey: post.rkey,
  });

  // If this was a reply, decrement parent's comment count
  if (post.replyParent) {
    await postDb.decrementCommentCount(post.replyParent);
  }

  // Delete from database (cascades to votes)
  await postDb.deletePost(postUri);

  // Update community post count if top-level post
  if (!post.replyRoot) {
    const community = await communityDb.findCommunityById(post.communityId);
    if (community) {
      await communityDb.updateCommunity(post.communityId, {
        postCount: Math.max((community.postCount || 1) - 1, 0),
      });
    }
  }
}

/**
 * Calculate hot score for a post
 * Formula: (votes - 1)^0.8 / (age + 2)^1.8
 */
export function calculateHotScore(
  voteCount: number,
  createdAt: Date
): number {
  const points = Math.max(voteCount - 1, 0); // Subtract 1 for self-vote
  const ageInHours = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
  const gravity = 1.8;

  const timeDecay = Math.pow(ageInHours + 2, gravity);
  const voteWeight = Math.pow(points, 0.8);

  return voteWeight / timeDecay;
}

/**
 * Recalculate hot scores for posts in a community
 * Used for batch updates (cron job)
 */
export async function recalculateHotScores(
  communityId?: string
): Promise<number> {
  // Get posts to recalculate (last 7 days)
  const posts = await postDb.listPosts(
    {
      communityId,
      limit: 1000,
      sortBy: 'new',
    },
    undefined
  );

  let updated = 0;
  for (const post of posts) {
    const ageInDays =
      (Date.now() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60 * 24);

    // Only recalculate posts less than 7 days old
    if (ageInDays < 7) {
      await postDb.recalculateHotScore(post.uri);
      updated++;
    }
  }

  return updated;
}
