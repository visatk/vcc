import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { eq, and } from 'drizzle-orm';
import { getDb } from '../db';
import { reviews, downloads, vouchRequests, storeCreditTransactions, users } from '../db/schema';
import { Env } from '../types';
import { authMiddleware, AuthUser } from '../middleware/auth';

const reviewsRouter = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

// GET /api/reviews/:productId - Get all approved reviews for a product
reviewsRouter.get('/:productId', async (c) => {
  const productId = Number(c.req.param('productId'));
  const db = getDb(c.env);

  const productReviews = await db.query.reviews.findMany({
    where: and(eq(reviews.productId, productId), eq(reviews.approved, true)),
    with: { user: { columns: { name: true } } },
    orderBy: (reviews, { desc }) => [desc(reviews.createdAt)]
  });

  return c.json(productReviews);
});

// POST /api/reviews - Leave a review
reviewsRouter.post(
  '/',
  authMiddleware,
  zValidator('json', z.object({
    productId: z.number(),
    rating: z.number().min(1).max(5),
    comment: z.string().optional()
  }).strict()),
  async (c) => {
    const { productId, rating, comment } = c.req.valid('json');
    const user = c.get('user');
    const db = getDb(c.env);

    // 1. Verify user actually purchased it
    const hasPurchased = await db.query.downloads.findFirst({
      where: and(eq(downloads.userId, user.id), eq(downloads.productId, productId))
    });

    if (!hasPurchased) {
      return c.json({ success: false, message: 'You must purchase this product to leave a review.' }, 403);
    }

    // 2. Check if already reviewed
    const existingReview = await db.query.reviews.findFirst({
      where: and(eq(reviews.userId, user.id), eq(reviews.productId, productId))
    });

    if (existingReview) {
      return c.json({ success: false, message: 'You have already reviewed this product.' }, 400);
    }

    // 3. Insert Review (defaults to unapproved)
    try {
      await db.insert(reviews).values({
        productId,
        userId: user.id,
        rating,
        comment,
        approved: false
      });
      return c.json({ success: true, message: 'Review submitted and pending approval.' }, 201);
    } catch (err) {
      return c.json({ success: false, message: 'Failed to submit review' }, 500);
    }
  }
);

// PUT /api/reviews/:id/approve - Approve a review (Admin)
reviewsRouter.put('/:id/approve', authMiddleware, async (c) => {
  const user = c.get('user');
  if (user.role !== 'admin') return c.json({ error: 'Forbidden' }, 403);

  const id = Number(c.req.param('id'));
  const db = getDb(c.env);
  
  await db.update(reviews).set({ approved: true }).where(eq(reviews.id, id));
  return c.json({ success: true });
});

// POST /api/reviews/vouch/:token - Leave a review from a vouch email and get $5
reviewsRouter.post(
  '/vouch/:token',
  zValidator('json', z.object({
    productId: z.number(),
    rating: z.number().min(1).max(5),
    comment: z.string().optional()
  }).strict()),
  async (c) => {
    const token = c.req.param('token');
    const { productId, rating, comment } = c.req.valid('json');
    const db = getDb(c.env);

    const vouchReq = await db.query.vouchRequests.findFirst({
      where: eq(vouchRequests.token, token),
      with: { order: { with: { items: true } } }
    });

    if (!vouchReq) {
      return c.json({ success: false, message: 'Invalid token' }, 400);
    }

    if (vouchReq.rewarded) {
      return c.json({ success: false, message: 'Token already used' }, 400);
    }

    const isProductInOrder = vouchReq.order?.items.some(item => item.productId === productId);
    if (!isProductInOrder) {
      return c.json({ success: false, message: 'Product not found in the associated order' }, 400);
    }

    try {
      await db.insert(reviews).values({
        productId,
        userId: vouchReq.userId,
        rating,
        comment,
        approved: false
      });

      const user = await db.query.users.findFirst({ where: eq(users.id, vouchReq.userId) });
      if (user) {
        await db.update(users)
          .set({ balanceUsd: user.balanceUsd + 5.00 })
          .where(eq(users.id, user.id));
          
        await db.insert(storeCreditTransactions).values({
          userId: user.id,
          amountUsd: 5.00,
          reason: 'Vouch Review Reward'
        });
      }

      await db.update(vouchRequests)
        .set({ rewarded: true })
        .where(eq(vouchRequests.id, vouchReq.id));

      return c.json({ success: true, message: 'Review submitted and $5 credited to your account!' }, 201);
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: 'Failed to submit vouch review' }, 500);
    }
  }
);

export { reviewsRouter };
