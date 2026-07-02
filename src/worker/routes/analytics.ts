import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import { getDb } from '../db';
import { orders, orderItems, users, products } from '../db/schema';
import { Env } from '../types';
import { authMiddleware, adminMiddleware, AuthUser } from '../middleware/auth';

export const analyticsRouter = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

// GET /api/analytics/overview - Fetch high-level stats
analyticsRouter.get('/overview', authMiddleware, adminMiddleware, async (c) => {
  const db = getDb(c.env);
  
  // 1. Total Revenue (Completed orders only)
  const totalRevenueResult = await db.select({
    total: sql<number>`COALESCE(SUM(${orders.totalUsd} - ${orders.discountUsd}), 0)`
  }).from(orders).where(sql`${orders.status} = 'completed'`).get();
  
  // 2. Revenue Last 30 Days
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  const recentRevenueResult = await db.select({
    total: sql<number>`COALESCE(SUM(${orders.totalUsd} - ${orders.discountUsd}), 0)`
  }).from(orders).where(sql`${orders.status} = 'completed' AND ${orders.createdAt} > ${thirtyDaysAgo}`).get();
  
  // 3. Total Users
  const usersResult = await db.select({ count: sql<number>`COUNT(*)` }).from(users).get();
  
  // 4. Total Orders
  const ordersResult = await db.select({ count: sql<number>`COUNT(*)` }).from(orders).where(sql`${orders.status} = 'completed'`).get();
  
  // 5. Top 5 Best Selling Products
  const topProducts = await db.select({
    productId: products.id,
    title: products.title,
    salesCount: sql<number>`COUNT(${orderItems.id})`
  })
  .from(orderItems)
  .leftJoin(products, sql`${orderItems.productId} = ${products.id}`)
  .leftJoin(orders, sql`${orderItems.orderId} = ${orders.id}`)
  .where(sql`${orders.status} = 'completed'`)
  .groupBy(products.id)
  .orderBy(sql`COUNT(${orderItems.id}) DESC`)
  .limit(5);

  return c.json({
    totalRevenue: totalRevenueResult?.total || 0,
    recentRevenue: recentRevenueResult?.total || 0,
    totalUsers: usersResult?.count || 0,
    totalOrders: ordersResult?.count || 0,
    topProducts
  });
});
