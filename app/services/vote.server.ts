import { TID } from '@atproto/common';
import { getAgentForUser } from '~/lib/atproto.server';
import * as voteDb from '~/lib/db/votes.server';
import * as postDb from '~/lib/db/posts.server';
import { findUserById } from '~/lib/db/users.server';

/**
 * Vote on a post (upvote or downvote)
 * 1. Check if user has already voted
 * 2. If same direction, remove vote (unvote)
 * 3. If different direction, update vote
 * 4. If new vote, create vote
 * 5. Update post vote count
 * 6. Recalculate post hot score
 * 7. Update author karma
 */
export async function vote(
  userId: string,
  userDid: string,
  postUri: string,
  direction: 'up' | 'down'
): Promise<void> {
  // Check if post exists
  const post = await postDb.findPostByUri(postUri);
  if (!post) {
    throw new Error('Post not found');
  }

  // Get user's CID for the post (needed for strongRef)
  const postCid = post.cid;

  // Check for existing vote
  const existingVote = await voteDb.findVote(userId, postUri);

  // Get authenticated agent
  const agent = await getAgentForUser(userDid);
  if (!agent) {
    throw new Error('Failed to authenticate with ATProto');
  }

  if (existingVote) {
    if (existingVote.direction === direction) {
      // Same direction = unvote (remove)
      await unvote(userId, userDid, postUri);
      return;
    } else {
      // Different direction = update vote
      // Delete old ATProto record
      await agent.com.atproto.repo.deleteRecord({
        repo: userDid,
        collection: 'mlcommons.community.vote',
        rkey: existingVote.rkey,
      });

      // Create new vote with new direction
      const newRkey = TID.nextStr();
      const record = {
        $type: 'mlcommons.community.vote',
        subject: {
          uri: postUri,
          cid: postCid,
        },
        direction,
        createdAt: new Date().toISOString(),
      };

      const result = await agent.com.atproto.repo.createRecord({
        repo: userDid,
        collection: 'mlcommons.community.vote',
        rkey: newRkey,
        record,
      });

      // Update database
      await voteDb.updateVote(userId, postUri, direction);

      // Update post vote count
      await postDb.updatePostVoteCount(postUri);

      // Recalculate hot score
      await postDb.recalculateHotScore(postUri);

      // Update author karma (2 point swing: +1 to -1 or vice versa)
      const karmaDelta = direction === 'up' ? 2 : -2;
      await updateAuthorKarma(post.authorDid, karmaDelta);
    }
  } else {
    // New vote
    const rkey = TID.nextStr();
    const record = {
      $type: 'mlcommons.community.vote',
      subject: {
        uri: postUri,
        cid: postCid,
      },
      direction,
      createdAt: new Date().toISOString(),
    };

    const result = await agent.com.atproto.repo.createRecord({
      repo: userDid,
      collection: 'mlcommons.community.vote',
      rkey,
      record,
    });

    // Store in database
    await voteDb.insertVote({
      uri: result.data.uri,
      rkey,
      authorDid: userId,
      subjectUri: postUri,
      direction,
      createdAt: new Date(),
    });

    // Update post vote count
    await postDb.updatePostVoteCount(postUri);

    // Recalculate hot score
    await postDb.recalculateHotScore(postUri);

    // Update author karma
    const karmaDelta = direction === 'up' ? 1 : -1;
    await updateAuthorKarma(post.authorDid, karmaDelta);
  }
}

/**
 * Remove vote from a post
 */
export async function unvote(
  userId: string,
  userDid: string,
  postUri: string
): Promise<void> {
  // Get existing vote
  const existingVote = await voteDb.findVote(userId, postUri);
  if (!existingVote) {
    return; // No vote to remove
  }

  // Get authenticated agent
  const agent = await getAgentForUser(userDid);
  if (!agent) {
    throw new Error('Failed to authenticate with ATProto');
  }

  // Delete ATProto record
  await agent.com.atproto.repo.deleteRecord({
    repo: userDid,
    collection: 'mlcommons.community.vote',
    rkey: existingVote.rkey,
  });

  // Delete from database
  await voteDb.deleteVote(userId, postUri);

  // Update post vote count
  await postDb.updatePostVoteCount(postUri);

  // Recalculate hot score
  await postDb.recalculateHotScore(postUri);

  // Update author karma
  const post = await postDb.findPostByUri(postUri);
  if (post) {
    const karmaDelta = existingVote.direction === 'up' ? -1 : 1;
    await updateAuthorKarma(post.authorDid, karmaDelta);
  }
}

/**
 * Get vote status for multiple posts (bulk operation)
 */
export async function getVoteStatus(
  userId: string,
  postUris: string[]
): Promise<Map<string, 'up' | 'down'>> {
  return await voteDb.getVoteStatusBulk(userId, postUris);
}

/**
 * Update author's karma based on vote
 */
export async function updateAuthorKarma(
  authorId: string,
  delta: number
): Promise<void> {
  const user = await findUserById(authorId);
  if (!user) return;

  // Determine if this is a post or comment based on context
  // For now, assume post karma (can be refined later)
  const newPostKarma = (user.postKarma || 0) + delta;

  // Update user's post karma
  await import('~/lib/db/users.server').then((mod) =>
    mod.updateUser(authorId, {
      postKarma: Math.max(newPostKarma, 0), // Don't go below 0
    })
  );
}
