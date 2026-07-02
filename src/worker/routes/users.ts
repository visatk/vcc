import { Hono } from 'hono';
import { getDb } from '../db';
import { users } from '../db/schema';
import { Env } from '../types';
import { authMiddleware, adminMiddleware, AuthUser } from '../middleware/auth';
import { eq } from 'drizzle-orm';

const usersRouter = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

// GET /api/users/profile - Get authenticated user profile with orders and downloads
usersRouter.get('/profile', authMiddleware, async (c) => {
  const db = getDb(c.env);
  const user = c.get('user');

  // Relational JSON query! Fetches user, their orders, and their downloads in 1 SQL query.
  const userProfile = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    columns: { passwordHash: false }, // Don't return password
    with: {
      orders: true,
      downloads: {
        with: {
          product: true // Include product details for the download
        }
      }
    }
  });

  if (!userProfile) return c.json({ error: 'User not found' }, 404);

  return c.json(userProfile);
});

// GET /api/users - List all users (Admin only)
usersRouter.get('/', authMiddleware, adminMiddleware, async (c) => {
  const db = getDb(c.env);
  const allUsers = await db.query.users.findMany({
    columns: { passwordHash: false }
  });
  return c.json(allUsers);
});

export { usersRouter };
