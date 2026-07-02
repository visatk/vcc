import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { getDb } from '../db';
import { categories } from '../db/schema';
import { Env } from '../types';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware, adminMiddleware, AuthUser } from '../middleware/auth';

const categoriesRouter = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

categoriesRouter.get('/', async (c) => {
  const db = getDb(c.env);
  const allCategories = await db.query.categories.findMany();
  return c.json(allCategories);
});

categoriesRouter.post('/', 
  authMiddleware, 
  adminMiddleware, 
  zValidator('json', z.object({
    name: z.string().min(1),
    slug: z.string().min(1),
    description: z.string().optional().nullable(),
  }).strict()),
  async (c) => {
    const data = c.req.valid('json');
    const db = getDb(c.env);

    try {
      const result = await db.insert(categories).values(data).returning().get();
      return c.json(result, 201);
    } catch (err: any) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return c.json({ success: false, message: 'Category with this name or slug already exists' }, 400);
      }
      return c.json({ success: false, message: 'Internal server error' }, 500);
    }
  }
);

categoriesRouter.delete('/:id', authMiddleware, adminMiddleware, async (c) => {
  const id = Number(c.req.param('id'));
  const db = getDb(c.env);
  await db.delete(categories).where(eq(categories.id, id));
  return c.json({ success: true });
});

export { categoriesRouter };
