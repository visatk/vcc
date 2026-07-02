import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { eq } from 'drizzle-orm';
import { getDb } from '../db';
import { abandonedCarts } from '../db/schema';
import { Env } from '../types';
import { authMiddleware, AuthUser } from '../middleware/auth';

const cartRouter = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

// POST /api/cart/sync - Sync frontend cart to backend to track abandonment
cartRouter.post(
  '/sync',
  authMiddleware,
  zValidator('json', z.object({
    items: z.array(z.any())
  })),
  async (c) => {
    const { items } = c.req.valid('json');
    const user = c.get('user');
    const db = getDb(c.env);

    try {
      if (items.length === 0) {
        // If cart is empty, mark as recovered or delete it
        await db.delete(abandonedCarts).where(eq(abandonedCarts.userId, user.id));
        return c.json({ success: true, message: 'Cart cleared' });
      }

      // Upsert cart
      const existing = await db.query.abandonedCarts.findFirst({
        where: eq(abandonedCarts.userId, user.id)
      });

      if (existing) {
        await db.update(abandonedCarts).set({
          cartDataJson: JSON.stringify(items),
          updatedAt: new Date(),
          recovered: false
        }).where(eq(abandonedCarts.id, existing.id));
      } else {
        await db.insert(abandonedCarts).values({
          userId: user.id,
          cartDataJson: JSON.stringify(items),
          recovered: false
        });
      }

      return c.json({ success: true });
    } catch (err) {
      return c.json({ success: false }, 500);
    }
  }
);

// GET /api/cart/abandoned - Admin view of abandoned carts
cartRouter.get('/abandoned', authMiddleware, async (c) => {
  const user = c.get('user');
  if (user.role !== 'admin') return c.json({ error: 'Forbidden' }, 403);

  const db = getDb(c.env);
  const carts = await db.query.abandonedCarts.findMany({
    with: { user: { columns: { name: true, email: true } } },
    orderBy: (carts, { desc }) => [desc(carts.updatedAt)]
  });

  return c.json(carts);
});

export { cartRouter };
