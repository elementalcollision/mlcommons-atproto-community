import { db } from '~/lib/db.server';
import { users } from '../../../db/schema/users';
import { eq } from 'drizzle-orm';
import type { User, NewUser } from '../../../db/schema/users';

/**
 * Find user by ID
 */
export async function findUserById(id: string): Promise<User | null> {
  const result = await db.query.users.findFirst({
    where: eq(users.id, id),
  });

  return result || null;
}

/**
 * Find user by email
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  const result = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  return result || null;
}

/**
 * Update user
 */
export async function updateUser(
  id: string,
  data: Partial<NewUser>
): Promise<User> {
  const [user] = await db
    .update(users)
    .set(data)
    .where(eq(users.id, id))
    .returning();

  return user;
}

/**
 * Delete user
 */
export async function deleteUser(id: string): Promise<void> {
  await db.delete(users).where(eq(users.id, id));
}
