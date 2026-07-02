import { Hono } from 'hono';
import { eq, inArray, and, sql } from 'drizzle-orm';
import { getDb } from '../db';
import { products, productCategories, productVariants, volumeDiscounts } from '../db/schema';
import { Env } from '../types';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { cache } from 'hono/cache';
import { authMiddleware, adminMiddleware, AuthUser } from '../middleware/auth';

import { AppVariables } from '../types';

const productsRouter = new Hono<{ Bindings: Env; Variables: AppVariables }>();

// GET /api/products - List all products with Cache API and Pagination
productsRouter.get(
  '/', 
  cache({ cacheName: 'vcc-api', cacheControl: 'public, max-age=300' }), 
  async (c) => {
  const cacheUrl = new URL(c.req.url);
  const page = Number(cacheUrl.searchParams.get('page')) || 1;
  const limit = Number(cacheUrl.searchParams.get('limit')) || 20;
  const offset = (page - 1) * limit;

  // 1. Fetch from D1
  const db = c.get('db');
  
  // Get total count for pagination
  const totalCountResult = await db.select({ count: sql`count(*)` }).from(products);
  const total = totalCountResult[0].count as number;

  const allProducts = await db.query.products.findMany({
    limit,
    offset,
    with: {
      productCategories: {
        with: {
          category: true
        }
      },
      variants: true,
      volumeDiscounts: true,
      reviews: {
        where: (reviews, { eq }) => eq(reviews.approved, true),
        columns: { rating: true }
      }
    }
  });

  const productsWithRatings = allProducts.map(p => {
    const reviewCount = p.reviews.length;
    const averageRating = reviewCount > 0 ? p.reviews.reduce((acc, r) => acc + r.rating, 0) / reviewCount : 0;
    const { reviews, ...rest } = p;
    return { ...rest, reviewCount, averageRating };
  });
  
  const result = {
    data: productsWithRatings,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };

  return c.json(result);
});

// GET /api/products/:id - Get a specific product (with caching)
productsRouter.get(
  '/:id', 
  cache({ cacheName: 'vcc-api', cacheControl: 'public, max-age=300' }), 
  async (c) => {
  const id = Number(c.req.param('id'));
  
  const db = c.get('db');
  const product = await db.query.products.findFirst({
    where: eq(products.id, id),
    with: {
      productCategories: {
        with: {
          category: true
        }
      },
      variants: true,
      volumeDiscounts: true,
      reviews: {
        where: (reviews, { eq }) => eq(reviews.approved, true),
        columns: { rating: true }
      }
    }
  });
  
  if (!product) {
    return c.json({ error: 'Product not found' }, 404);
  }

  const reviewCount = product.reviews.length;
  const averageRating = reviewCount > 0 ? product.reviews.reduce((acc, r) => acc + r.rating, 0) / reviewCount : 0;
  const { reviews, ...rest } = product;
  const productWithRatings = { ...rest, reviewCount, averageRating };

  return c.json(productWithRatings);
});

// POST /api/products - Create a new product (Admin Only)
productsRouter.post('/', 
  authMiddleware, 
  adminMiddleware, 
  zValidator('json', z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    priceUsd: z.number().nonnegative(),
    type: z.enum(['file', 'serial', 'subscription', 'service', 'product']).optional(),
    pricingModel: z.enum(['one-time', 'free', 'pay-what-you-want']).optional(),
    minPriceUsd: z.number().nonnegative().optional().nullable(),
    billingInterval: z.enum(['monthly', 'yearly']).optional().nullable(),
    imageUrl: z.string().optional().nullable(),
    downloadUrl: z.string().optional().nullable(),
    serialKey: z.string().optional().nullable(),
    categoryIds: z.array(z.number()).optional(),
    variants: z.array(z.object({
      title: z.string(),
      priceUsd: z.number().nonnegative(),
      billingInterval: z.enum(['monthly', 'yearly']).optional().nullable()
    })).optional(),
    volumeDiscounts: z.array(z.object({
      minQuantity: z.number().int().positive(),
      discountPercentage: z.number().nonnegative().max(100)
    })).optional(),
  }).strict()),
  async (c) => {
    const data = c.req.valid('json');
    const { categoryIds, variants, volumeDiscounts, ...productData } = data;
    const db = c.get('db');

    const result = await db.transaction(async (tx) => {
      const insertedProduct = await tx.insert(products).values(productData).returning().get();
      
      if (categoryIds && categoryIds.length > 0) {
        const catInserts = categoryIds.map(cid => ({
          productId: insertedProduct.id,
          categoryId: cid
        }));
        await tx.insert(productCategories).values(catInserts);
      }

      if (variants && variants.length > 0) {
        const varInserts = variants.map(v => ({ ...v, productId: insertedProduct.id }));
        await tx.insert(productVariants).values(varInserts);
      }

      if (volumeDiscounts && volumeDiscounts.length > 0) {
        const vdInserts = volumeDiscounts.map(vd => ({ ...vd, productId: insertedProduct.id }));
        await tx.insert(volumeDiscounts).values(vdInserts);
      }
      return insertedProduct;
    });

    return c.json(result, 201);
  }
);

// PUT /api/products/:id - Update a product (Admin Only)
productsRouter.put('/:id', 
  authMiddleware, 
  adminMiddleware, 
  zValidator('json', z.object({
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    priceUsd: z.number().nonnegative().optional(),
    type: z.enum(['file', 'serial', 'subscription', 'service', 'product']).optional(),
    pricingModel: z.enum(['one-time', 'free', 'pay-what-you-want']).optional(),
    minPriceUsd: z.number().nonnegative().optional().nullable(),
    billingInterval: z.enum(['monthly', 'yearly']).optional().nullable(),
    imageUrl: z.string().optional().nullable(),
    downloadUrl: z.string().optional().nullable(),
    serialKey: z.string().optional().nullable(),
    categoryIds: z.array(z.number()).optional(),
    variants: z.array(z.object({
      title: z.string(),
      priceUsd: z.number().nonnegative(),
      billingInterval: z.enum(['monthly', 'yearly']).optional().nullable()
    })).optional(),
    volumeDiscounts: z.array(z.object({
      minQuantity: z.number().int().positive(),
      discountPercentage: z.number().nonnegative().max(100)
    })).optional(),
  }).strict()),
  async (c) => {
    const id = Number(c.req.param('id'));
    const data = c.req.valid('json');
    const { categoryIds, variants, volumeDiscounts, ...productData } = data;
    const db = c.get('db');

    const result = await db.transaction(async (tx) => {
      const updatedProduct = await tx.update(products).set(productData).where(eq(products.id, id)).returning().get();
      
      if (!updatedProduct) return null;

      if (categoryIds !== undefined) {
        // Clear old ones
        await tx.delete(productCategories).where(eq(productCategories.productId, id));
        // Insert new ones
        if (categoryIds.length > 0) {
          const catInserts = categoryIds.map(cid => ({
            productId: id,
            categoryId: cid
          }));
          await tx.insert(productCategories).values(catInserts);
        }
      }

      if (variants !== undefined) {
        await tx.delete(productVariants).where(eq(productVariants.productId, id));
        if (variants.length > 0) {
          const varInserts = variants.map(v => ({ ...v, productId: id }));
          await tx.insert(productVariants).values(varInserts);
        }
      }

      if (volumeDiscounts !== undefined) {
        await tx.delete(volumeDiscounts).where(eq(volumeDiscounts.productId, id));
        if (volumeDiscounts.length > 0) {
          const vdInserts = volumeDiscounts.map(vd => ({ ...vd, productId: id }));
          await tx.insert(volumeDiscounts).values(vdInserts);
        }
      }
      return updatedProduct;
    });
    
    if (!result) return c.json({ error: 'Product not found' }, 404);

    return c.json(result);
  }
);

// DELETE /api/products/:id - Delete a product (Admin Only)
productsRouter.delete('/:id', authMiddleware, adminMiddleware, async (c) => {
  const id = Number(c.req.param('id'));
  const db = c.get('db');

  await db.transaction(async (tx) => {
    await tx.delete(productCategories).where(eq(productCategories.productId, id));
    await tx.delete(productVariants).where(eq(productVariants.productId, id));
    await tx.delete(volumeDiscounts).where(eq(volumeDiscounts.productId, id));
    await tx.delete(products).where(eq(products.id, id));
  });

  return c.json({ success: true });
});

export { productsRouter };
