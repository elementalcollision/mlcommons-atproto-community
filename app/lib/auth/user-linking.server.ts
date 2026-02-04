import { db } from "../db.server";
import { users, identities } from "../../../db/schema";
import { eq, and } from "drizzle-orm";
import type { ProviderUser } from "./providers/provider.types";

/**
 * Find user by provider identity
 */
export async function findUserByProvider(
  provider: string,
  providerUserId: string
) {
  const identity = await db.query.identities.findFirst({
    where: and(
      eq(identities.provider, provider),
      eq(identities.providerUserId, providerUserId)
    ),
    with: {
      user: true,
    },
  });

  return identity ? { user: identity.user, identity } : null;
}

/**
 * Find user by email (for account linking)
 */
export async function findUserByEmail(email: string) {
  return await db.query.users.findFirst({
    where: eq(users.email, email),
  });
}

/**
 * Create a new user
 */
export async function createUser(providerUser: ProviderUser) {
  const userId = crypto.randomUUID();

  const [newUser] = await db.insert(users).values({
    id: userId,
    email: providerUser.email,
    displayName: providerUser.displayName,
    avatar: providerUser.avatar,
  }).returning();

  return newUser;
}

/**
 * Link a provider identity to a user
 */
export async function linkProviderToUser(
  userId: string,
  provider: string,
  providerUser: ProviderUser
) {
  // Check if this provider identity already exists
  const existing = await db.query.identities.findFirst({
    where: and(
      eq(identities.provider, provider),
      eq(identities.providerUserId, providerUser.providerId)
    ),
  });

  if (existing && existing.userId !== userId) {
    throw new Error("This provider account is already linked to another user");
  }

  // Create or update identity
  const identityId = crypto.randomUUID();

  const [identity] = await db.insert(identities).values({
    id: identityId,
    userId,
    provider,
    providerUserId: providerUser.providerId,
    email: providerUser.email,
    handle: providerUser.handle,
    displayName: providerUser.displayName,
    avatar: providerUser.avatar,
    rawData: providerUser.providerMetadata,
    linkedAt: new Date(),
    lastUsedAt: new Date(),
  }).onConflictDoUpdate({
    target: [identities.provider, identities.providerUserId],
    set: {
      lastUsedAt: new Date(),
      email: providerUser.email,
      displayName: providerUser.displayName,
      avatar: providerUser.avatar,
      rawData: providerUser.providerMetadata,
    },
  }).returning();

  return identity;
}

/**
 * Get or create user from provider authentication
 * This is the main entry point for authentication flow
 */
export async function getUserOrCreate(
  provider: string,
  providerUser: ProviderUser
) {
  // First, check if this provider identity already exists
  const existingIdentity = await findUserByProvider(provider, providerUser.providerId);

  if (existingIdentity) {
    // Update last used timestamp
    await db.update(identities)
      .set({ lastUsedAt: new Date() })
      .where(eq(identities.id, existingIdentity.identity.id));

    return {
      user: existingIdentity.user,
      identity: existingIdentity.identity,
      isNewUser: false,
    };
  }

  // If no existing identity, check if user exists by email (for account linking)
  let user = null;
  if (providerUser.email) {
    user = await findUserByEmail(providerUser.email);
  }

  // Create new user if not found
  if (!user) {
    user = await createUser(providerUser);
  }

  // Link provider to user
  const identity = await linkProviderToUser(user.id, provider, providerUser);

  return {
    user,
    identity,
    isNewUser: !existingIdentity,
  };
}

/**
 * Get all identities for a user
 */
export async function getUserIdentities(userId: string) {
  return await db.query.identities.findMany({
    where: eq(identities.userId, userId),
  });
}

/**
 * Unlink a provider from a user (ensure user has at least one identity)
 */
export async function unlinkProvider(userId: string, provider: string) {
  // Get all user identities
  const userIdentities = await getUserIdentities(userId);

  if (userIdentities.length <= 1) {
    throw new Error("Cannot unlink the last authentication method");
  }

  // Delete the identity
  await db.delete(identities).where(
    and(
      eq(identities.userId, userId),
      eq(identities.provider, provider)
    )
  );
}
