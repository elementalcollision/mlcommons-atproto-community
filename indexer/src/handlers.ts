/**
 * Firehose Event Handlers
 *
 * Handles incoming ATProto events and syncs them to the database.
 */

import { eq, sql } from 'drizzle-orm';
import { db, schema } from './db.js';
import type { FirehoseEvent } from './firehose.js';

const { posts, votes, communities, users } = schema;

/**
 * Main event handler - routes to specific handlers based on collection
 */
export async function handleEvent(event: FirehoseEvent): Promise<void> {
  if (event.kind !== 'commit' || !event.commit) {
    return;
  }

  const { collection, operation, rkey, record, cid } = event.commit;
  const did = event.did;
  const uri = `at://${did}/${collection}/${rkey}`;

  try {
    switch (collection) {
      case 'mlcommons.community.post':
        await handlePostEvent(operation, uri, did, rkey, cid, record);
        break;

      case 'mlcommons.community.vote':
        await handleVoteEvent(operation, uri, did, rkey, record);
        break;

      case 'mlcommons.community.community':
        await handleCommunityEvent(operation, uri, did, rkey, cid, record);
        break;

      default:
        console.log(`[Handler] Unknown collection: ${collection}`);
    }
  } catch (error) {
    console.error(`[Handler] Error processing ${operation} on ${collection}:`, error);
  }
}

/**
 * Handle post create/update/delete events
 */
async function handlePostEvent(
  operation: string,
  uri: string,
  did: string,
  rkey: string,
  cid: string | undefined,
  record: Record<string, unknown> | undefined
): Promise<void> {
  switch (operation) {
    case 'create':
    case 'update':
      if (!record || !cid) {
        console.log(`[Handler] Missing record or cid for post ${operation}`);
        return;
      }

      // Ensure user exists (upsert)
      await ensureUserExists(did);

      // Extract community ID from communityRef
      const communityRef = record.communityRef as string | undefined;
      if (!communityRef) {
        console.log(`[Handler] Post missing communityRef: ${uri}`);
        return;
      }

      // Find community by ATProto URI
      const community = await db.query.communities.findFirst({
        where: eq(communities.atprotoUri, communityRef),
      });

      if (!community) {
        console.log(`[Handler] Community not found for ref: ${communityRef}`);
        return;
      }

      // Build post data
      const postData = {
        uri,
        rkey,
        cid,
        authorDid: did,
        communityId: community.id,
        title: (record.title as string) || null,
        text: (record.text as string) || '',
        embedType: record.embed ? ((record.embed as { type?: string }).type || null) : null,
        embedData: record.embed ? JSON.stringify(record.embed) : null,
        tags: (record.tags as string[]) || null,
        lang: (record.lang as string) || null,
        replyParent: (record.reply as { parent?: string })?.parent || null,
        replyRoot: (record.reply as { root?: string })?.root || null,
        createdAt: new Date(record.createdAt as string),
        indexedAt: new Date(),
      };

      if (operation === 'create') {
        await db.insert(posts).values(postData).onConflictDoNothing();

        // Update community post count if top-level post
        if (!postData.replyRoot) {
          await db
            .update(communities)
            .set({ postCount: sql`${communities.postCount} + 1` })
            .where(eq(communities.id, community.id));
        }

        // Update parent comment count if reply
        if (postData.replyParent) {
          await db
            .update(posts)
            .set({ commentCount: sql`${posts.commentCount} + 1` })
            .where(eq(posts.uri, postData.replyParent));
        }

        console.log(`[Handler] Created post: ${uri}`);
      } else {
        await db
          .update(posts)
          .set({
            cid,
            title: postData.title,
            text: postData.text,
            embedType: postData.embedType,
            embedData: postData.embedData,
            tags: postData.tags,
            indexedAt: new Date(),
          })
          .where(eq(posts.uri, uri));

        console.log(`[Handler] Updated post: ${uri}`);
      }
      break;

    case 'delete':
      // Get post to check if it's a reply
      const existingPost = await db.query.posts.findFirst({
        where: eq(posts.uri, uri),
      });

      if (existingPost) {
        // Decrement parent comment count if reply
        if (existingPost.replyParent) {
          await db
            .update(posts)
            .set({ commentCount: sql`${posts.commentCount} - 1` })
            .where(eq(posts.uri, existingPost.replyParent));
        }

        // Decrement community post count if top-level
        if (!existingPost.replyRoot) {
          await db
            .update(communities)
            .set({ postCount: sql`${communities.postCount} - 1` })
            .where(eq(communities.id, existingPost.communityId));
        }

        // Delete the post
        await db.delete(posts).where(eq(posts.uri, uri));
        console.log(`[Handler] Deleted post: ${uri}`);
      }
      break;
  }
}

/**
 * Handle vote create/delete events (votes can't be updated)
 */
async function handleVoteEvent(
  operation: string,
  uri: string,
  did: string,
  rkey: string,
  record: Record<string, unknown> | undefined
): Promise<void> {
  switch (operation) {
    case 'create':
      if (!record) {
        console.log(`[Handler] Missing record for vote create`);
        return;
      }

      // Ensure user exists
      await ensureUserExists(did);

      const subject = record.subject as { uri: string; cid: string };
      const direction = record.direction as 'up' | 'down';

      // Check if user already has a vote on this subject
      const existingVote = await db.query.votes.findFirst({
        where: eq(votes.authorDid, did),
      });

      if (existingVote && existingVote.subjectUri === subject.uri) {
        // Remove old vote first
        await db.delete(votes).where(eq(votes.uri, existingVote.uri));

        // Adjust vote count
        const voteChange = existingVote.direction === 'up' ? -1 : 1;
        await updatePostVoteCount(subject.uri, voteChange);
      }

      // Create new vote
      await db.insert(votes).values({
        uri,
        rkey,
        authorDid: did,
        subjectUri: subject.uri,
        direction,
        createdAt: new Date(record.createdAt as string),
        indexedAt: new Date(),
      }).onConflictDoNothing();

      // Update vote count on subject
      const voteValue = direction === 'up' ? 1 : -1;
      await updatePostVoteCount(subject.uri, voteValue);

      console.log(`[Handler] Created vote: ${uri} (${direction})`);
      break;

    case 'delete':
      const vote = await db.query.votes.findFirst({
        where: eq(votes.uri, uri),
      });

      if (vote) {
        // Remove vote effect from subject
        const revertValue = vote.direction === 'up' ? -1 : 1;
        await updatePostVoteCount(vote.subjectUri, revertValue);

        // Delete the vote
        await db.delete(votes).where(eq(votes.uri, uri));
        console.log(`[Handler] Deleted vote: ${uri}`);
      }
      break;
  }
}

/**
 * Handle community create/update/delete events
 */
async function handleCommunityEvent(
  operation: string,
  uri: string,
  did: string,
  rkey: string,
  cid: string | undefined,
  record: Record<string, unknown> | undefined
): Promise<void> {
  switch (operation) {
    case 'create':
    case 'update':
      if (!record || !cid) {
        console.log(`[Handler] Missing record or cid for community ${operation}`);
        return;
      }

      // Ensure creator exists
      await ensureUserExists(did);

      // Check if community exists by ATProto URI
      const existingCommunity = await db.query.communities.findFirst({
        where: eq(communities.atprotoUri, uri),
      });

      if (existingCommunity) {
        // Update existing community
        await db
          .update(communities)
          .set({
            displayName: (record.displayName as string) || existingCommunity.displayName,
            description: record.description as string | undefined,
            avatar: record.avatar ? JSON.stringify(record.avatar) : null,
            banner: record.banner ? JSON.stringify(record.banner) : null,
            atprotoCid: cid,
            updatedAt: new Date(),
          })
          .where(eq(communities.id, existingCommunity.id));

        console.log(`[Handler] Updated community: ${uri}`);
      } else {
        // New community from firehose - create it
        const communityId = crypto.randomUUID();
        await db.insert(communities).values({
          id: communityId,
          creatorDid: did,
          name: (record.name as string) || rkey,
          displayName: (record.displayName as string) || (record.name as string) || rkey,
          description: record.description as string | undefined,
          avatar: record.avatar ? JSON.stringify(record.avatar) : null,
          banner: record.banner ? JSON.stringify(record.banner) : null,
          atprotoUri: uri,
          atprotoCid: cid,
          atprotoRkey: rkey,
          createdAt: new Date(),
          updatedAt: new Date(),
        }).onConflictDoNothing();

        console.log(`[Handler] Created community: ${uri}`);
      }
      break;

    case 'delete':
      // Mark community as deleted (don't actually delete - preserve posts)
      console.log(`[Handler] Community deleted event received: ${uri}`);
      // Could set a 'deleted' flag if needed
      break;
  }
}

/**
 * Ensure a user exists in the database (for foreign key constraints)
 */
async function ensureUserExists(did: string): Promise<void> {
  const existingUser = await db.query.users.findFirst({
    where: eq(users.id, did),
  });

  if (!existingUser) {
    await db.insert(users).values({
      id: did,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).onConflictDoNothing();
  }
}

/**
 * Update vote count on a post
 */
async function updatePostVoteCount(postUri: string, change: number): Promise<void> {
  await db
    .update(posts)
    .set({
      voteCount: sql`${posts.voteCount} + ${change}`,
    })
    .where(eq(posts.uri, postUri));
}
