import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { getDb } from '../db';
import { blacklist } from '../db/schema';
import { Env } from '../types';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware, adminMiddleware, AuthUser } from '../middleware/auth';

export const fraudRouter = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

// GET /api/fraud/blacklist - Get all blacklisted IPs and emails
fraudRouter.get('/blacklist', authMiddleware, adminMiddleware, async (c) => {
  const db = getDb(c.env);
  const items = await db.query.blacklist.findMany();
  return c.json(items);
});

// POST /api/fraud/blacklist - Add to blacklist
fraudRouter.post('/blacklist', 
  authMiddleware, 
  adminMiddleware, 
  zValidator('json', z.object({
    type: z.enum(['ip', 'email']),
    value: z.string().min(1),
    reason: z.string().optional(),
  }).strict()),
  async (c) => {
    const data = c.req.valid('json');
    const db = getDb(c.env);

    try {
      const result = await db.insert(blacklist).values(data).returning().get();
      return c.json(result, 201);
    } catch (err: any) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return c.json({ success: false, message: 'This item is already blacklisted' }, 400);
      }
      return c.json({ success: false, message: 'Internal server error' }, 500);
    }
  }
);

// DELETE /api/fraud/blacklist/:id - Remove from blacklist
fraudRouter.delete('/blacklist/:id', authMiddleware, adminMiddleware, async (c) => {
  const id = Number(c.req.param('id'));
  const db = getDb(c.env);
  await db.delete(blacklist).where(eq(blacklist.id, id));
  return c.json({ success: true });
});
