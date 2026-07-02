import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { getDb } from '../db';
import { coupons } from '../db/schema';
import { Env } from '../types';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware, adminMiddleware, AuthUser } from '../middleware/auth';

const couponsRouter = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

// Admin: Get all coupons
couponsRouter.get('/', authMiddleware, adminMiddleware, async (c) => {
  const db = getDb(c.env);
  const allCoupons = await db.query.coupons.findMany({
    orderBy: (coupons, { desc }) => [desc(coupons.createdAt)],
  });
  return c.json(allCoupons);
});

// Admin: Create a coupon
couponsRouter.post('/', 
  authMiddleware, 
  adminMiddleware, 
  zValidator('json', z.object({
    code: z.string().min(1).toUpperCase(),
    discountType: z.enum(['percentage', 'fixed']),
    discountValue: z.number().positive(),
    usageLimit: z.number().positive().optional().nullable(),
    expiryDate: z.number().optional().nullable(), // timestamp ms
  }).strict()),
  async (c) => {
    const { code, discountType, discountValue, usageLimit, expiryDate } = c.req.valid('json');
    const db = getDb(c.env);

    try {
      const result = await db.insert(coupons).values({
        code,
        discountType,
        discountValue,
        usageLimit: usageLimit ?? null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        isActive: true,
        usageCount: 0
      }).returning().get();
      return c.json(result, 201);
    } catch (err: any) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return c.json({ success: false, message: 'Coupon code already exists' }, 400);
      }
      return c.json({ success: false, message: 'Internal server error' }, 500);
    }
  }
);

// Admin: Delete a coupon
couponsRouter.delete('/:id', authMiddleware, adminMiddleware, async (c) => {
  const id = Number(c.req.param('id'));
  const db = getDb(c.env);
  await db.delete(coupons).where(eq(coupons.id, id));
  return c.json({ success: true });
});

// Public: Validate a coupon (doesn't apply it, just checks if valid and returns details)
couponsRouter.post('/validate',
  zValidator('json', z.object({
    code: z.string().min(1).toUpperCase(),
  }).strict()),
  async (c) => {
    const { code } = c.req.valid('json');
    const db = getDb(c.env);

    const coupon = await db.query.coupons.findFirst({
      where: eq(coupons.code, code)
    });

    if (!coupon) {
      return c.json({ success: false, message: 'Invalid coupon code' }, 404);
    }

    if (!coupon.isActive) {
      return c.json({ success: false, message: 'Coupon is no longer active' }, 400);
    }

    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      return c.json({ success: false, message: 'Coupon usage limit reached' }, 400);
    }

    if (coupon.expiryDate && Date.now() > coupon.expiryDate.getTime()) {
      return c.json({ success: false, message: 'Coupon has expired' }, 400);
    }

    return c.json({ 
      success: true, 
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue
      }
    });
  }
);

export { couponsRouter };
