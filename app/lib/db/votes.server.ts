import { db } from '~/lib/db.server';
import { votes } from '../../../db/schema/votes';
import { eq, and, inArray } from 'drizzle-orm';
import type { Vote, NewVote } from '../../../db/schema/votes';

/**
 * Find vote by user and subject
 */
export async function findVote(
  userId: string,
  subjectUri: string
): Promise<Vote | null> {
  const result = await db.query.votes.findFirst({
    where: and(eq(votes.authorDid, userId), eq(votes.subjectUri, subjectUri)),
  });

  return result || null;
}

/**
 * Find vote by URI
 */
export async function findVoteByUri(uri: string): Promise<Vote | null> {
  const result = await db.query.votes.findFirst({
    where: eq(votes.uri, uri),
  });

  return result || null;
}

/**
 * Insert new vote
 */
export async function insertVote(data: NewVote): Promise<Vote> {
  const [vote] = await db.insert(votes).values(data).returning();
  return vote;
}

/**
 * Update vote direction
 */
export async function updateVote(
  userId: string,
  subjectUri: string,
  direction: 'up' | 'down'
): Promise<Vote> {
  const [vote] = await db
    .update(votes)
    .set({ direction })
    .where(and(eq(votes.authorDid, userId), eq(votes.subjectUri, subjectUri)))
    .returning();

  return vote;
}

/**
 * Delete vote
 */
export async function deleteVote(
  userId: string,
  subjectUri: string
): Promise<void> {
  await db
    .delete(votes)
    .where(and(eq(votes.authorDid, userId), eq(votes.subjectUri, subjectUri)));
}

/**
 * Delete vote by URI (for ATProto record deletion)
 */
export async function deleteVoteByUri(uri: string): Promise<void> {
  await db.delete(votes).where(eq(votes.uri, uri));
}

/**
 * Get vote counts for a post (up and down)
 */
export async function getVoteCountForPost(
  subjectUri: string
): Promise<{ up: number; down: number; total: number }> {
  const upVotes = await db
    .select()
    .from(votes)
    .where(and(eq(votes.subjectUri, subjectUri), eq(votes.direction, 'up')));

  const downVotes = await db
    .select()
    .from(votes)
    .where(and(eq(votes.subjectUri, subjectUri), eq(votes.direction, 'down')));

  const up = upVotes.length;
  const down = downVotes.length;

  return {
    up,
    down,
    total: up - down,
  };
}

/**
 * Get vote status for multiple posts (bulk operation)
 */
export async function getVoteStatusBulk(
  userId: string,
  subjectUris: string[]
): Promise<Map<string, 'up' | 'down'>> {
  if (subjectUris.length === 0) {
    return new Map();
  }

  const userVotes = await db
    .select()
    .from(votes)
    .where(
      and(eq(votes.authorDid, userId), inArray(votes.subjectUri, subjectUris))
    );

  return new Map(userVotes.map((v) => [v.subjectUri, v.direction]));
}

/**
 * Check if user has voted on a post
 */
export async function hasUserVoted(
  userId: string,
  subjectUri: string
): Promise<boolean> {
  const vote = await findVote(userId, subjectUri);
  return !!vote;
}

/**
 * Get user's vote direction on a post
 */
export async function getUserVoteDirection(
  userId: string,
  subjectUri: string
): Promise<'up' | 'down' | null> {
  const vote = await findVote(userId, subjectUri);
  return vote?.direction || null;
}
