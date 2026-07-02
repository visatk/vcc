import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { eq, sql } from 'drizzle-orm';
import { upgradeWebSocket } from 'hono/cloudflare-workers';
import { orders, downloads, products, users, storeCreditTransactions } from '../db/schema';
import { AppVariables } from '../types';
import { authMiddleware } from '../middleware/auth';
import { sendDownloadEmail } from '../utils/email';
import { OrderService } from '../services/OrderService';

interface ApiRoneTickerResponse {
  [currency: string]: { usd: number };
}

interface ApiRoneForwardResponse {
  input_address?: string;
  message?: string;
}

const ordersRouter = new Hono<{ Bindings: Env; Variables: AppVariables }>();

const createOrderSchema = z.object({
  items: z.array(z.object({
    productId: z.number(),
    priceUsd: z.number().nonnegative(),
  })).min(1),
  couponCode: z.string().optional(),
  amountUsd: z.number().nonnegative(),
  currency: z.enum(['btc', 'ltc', 'bch', 'doge', 'trx']).optional(),
  useBalance: z.boolean().optional(),
});

// POST /api/orders/checkout - Initiate ApiRone crypto checkout
ordersRouter.post(
  '/checkout',
  authMiddleware,
  zValidator('json', createOrderSchema),
  async (c) => {
    const { items, couponCode, amountUsd, currency, useBalance } = c.req.valid('json');
    const user = c.get('user')!;
    const db = c.get('db');
    const orderService = new OrderService(db, c.env as any);
    
    const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For');
    const fraudReason = await orderService.checkFraud(ip, user.email);
    if (fraudReason) {
      return c.json({ success: false, message: fraudReason }, 403);
    }
    
    const fullUser = await db.query.users.findFirst({ where: (u, { eq }) => eq(u.id, user.id) });
    if (!fullUser) return c.json({ success: false, message: 'User not found' }, 404);

    try {
      const { calculatedSubtotal, discountUsd, validCouponId, expectedFinalTotal, balanceDeducted } = 
        await orderService.calculateCart(items, couponCode, useBalance, fullUser.balanceUsd);

      if (Math.abs(expectedFinalTotal - amountUsd) > 0.01) {
        return c.json({ success: false, message: 'Cart total mismatch' }, 400);
      }

      if (expectedFinalTotal === 0) {
        const orderId = await orderService.processFreeOrder(user, items, calculatedSubtotal, discountUsd, validCouponId, balanceDeducted);
        return c.json({ success: true, message: 'Free products claimed successfully', data: { orderId, isFree: true } }, 201);
      }
      
      if (!currency) return c.json({ success: false, message: 'Currency is required for paid checkout' }, 400);

      const rateRes = await fetch(`https://apirone.com/api/v2/ticker?currency=${currency}&fiat=usd`);
      const rateData = await rateRes.json() as ApiRoneTickerResponse;
      const cryptoRateUsd = rateData[currency]?.usd;
      if (!cryptoRateUsd) return c.json({ success: false, message: 'Failed to fetch exchange rate' }, 500);
      
      const cryptoAmount = (expectedFinalTotal / cryptoRateUsd).toFixed(8);
      
      let destAddress = (c.env as any).DESTINATION_BTC_ADDRESS;
      if (currency === 'ltc') destAddress = (c.env as any).DESTINATION_LTC_ADDRESS;
      if (currency === 'bch') destAddress = (c.env as any).DESTINATION_BCH_ADDRESS;
      if (currency === 'doge') destAddress = (c.env as any).DESTINATION_DOGE_ADDRESS;
      if (currency === 'trx') destAddress = (c.env as any).DESTINATION_TRX_ADDRESS;

      // SECURE WEBHOOK: Append WEBHOOK_SECRET
      const callbackUrl = encodeURIComponent(`https://vcc.cybercoderbd.com/api/orders/webhook?secret=${(c.env as any).WEBHOOK_SECRET}`);
      const apironeUrl = `https://apirone.com/api/v1/receive?method=create&address=${destAddress}&callback=${callbackUrl}&currency=${currency}`;
      
      const fwdRes = await fetch(apironeUrl);
      const fwdData = await fwdRes.json() as ApiRoneForwardResponse;
      
      if (!fwdData.input_address) return c.json({ success: false, message: 'Failed to generate crypto address' }, 500);
      
      const insertedOrder = await orderService.createCryptoOrder(
        user, items, currency, cryptoAmount, fwdData.input_address, 
        calculatedSubtotal, discountUsd, validCouponId, balanceDeducted
      );

      return c.json({ 
        success: true, 
        message: 'Checkout session created',
        data: { orderId: insertedOrder.id, depositAddress: insertedOrder.depositAddress, cryptoAmount: insertedOrder.cryptoAmount, currency: insertedOrder.cryptoCurrency, isFree: false }
      }, 201);

    } catch (err: any) {
      return c.json({ success: false, message: err.message || 'Internal server error during checkout' }, 500);
    }
  }
);

// GET /api/orders/webhook - ApiRone Webhook Callback (SECURED)
ordersRouter.get('/webhook', async (c) => {
  const { input_address, confirmations, transaction_hash, secret } = c.req.query();
  const db = c.get('db');
  
  // SECURE WEBHOOK VALIDATION
  if (secret !== (c.env as any).WEBHOOK_SECRET) {
    return c.text('unauthorized', 401);
  }

  if (!input_address || confirmations === undefined) {
    return c.text('invalid payload', 400);
  }
  
  const confs = Number(confirmations);
  
  if (confs >= 1) {
    try {
      const existingOrder = await db.query.orders.findFirst({
        where: eq(orders.depositAddress, input_address),
        with: { items: true }
      });

      if (existingOrder && existingOrder.status !== 'completed') {
        await db.transaction(async (tx) => {
          await tx.update(orders).set({ status: 'completed', cryptoTxHash: transaction_hash }).where(eq(orders.id, existingOrder.id));
          
          const downloadInserts = existingOrder.items.map(item => ({ userId: existingOrder.userId, productId: item.productId, orderId: existingOrder.id }));
          if (downloadInserts.length > 0) await tx.insert(downloads).values(downloadInserts);

          const fullUser = await tx.query.users.findFirst({ where: (u, { eq }) => eq(u.id, existingOrder.userId) });
          if (fullUser && fullUser.referredById && existingOrder.totalUsd > 0) {
            const commission = existingOrder.totalUsd * 0.10;
            await tx.update(users).set({ balanceUsd: sql`balance_usd + ${commission}` }).where(eq(users.id, fullUser.referredById));
            await tx.insert(storeCreditTransactions).values({ userId: fullUser.referredById, amountUsd: commission, reason: `Affiliate Commission for Order #${existingOrder.id}` });
          }
        });

        const user = await db.query.users.findFirst({ where: eq(users.id, existingOrder.userId) });
        if (user) {
          for (const item of existingOrder.items) {
            const product = await db.query.products.findFirst({ where: eq(products.id, item.productId) });
            if (product) {
              const downloadUrl = product.downloadUrl || `https://vcc.cybercoderbd.com/downloads/${product.id}`;
              c.executionCtx.waitUntil(sendDownloadEmail(c.env as any, user.email, product.title, downloadUrl));
            }
          }
        }
      }
    } catch (err) {
      console.error("Webhook fulfillment failed", err);
      return c.text('internal error', 500); 
    }
  }
  
  return c.text('*ok*', 200);
});

// GET /api/orders/ws/:id - WebSocket for real-time payment status
ordersRouter.get(
  '/ws/:id',
  upgradeWebSocket((c) => {
    const id = Number(c.req.param('id'));
    const db = c.get('db');
    let interval: ReturnType<typeof setInterval>;

    return {
      onOpen(_event: any, _ws: any) {
        interval = setInterval(async () => {
          try {
            const order = await db.query.orders.findFirst({ where: eq(orders.id, id) });
            if (order && order.status === 'completed') {
              ws.send(JSON.stringify(order));
              clearInterval(interval);
              ws.close();
            }
          } catch (e) {
            console.error('WS Polling Error', e);
          }
        }, 3000);
      },
      onClose() { if (interval) clearInterval(interval); },
      onError() { if (interval) clearInterval(interval); }
    };
  })
);

// GET /api/orders/:id - Get specific order details (Auth required)
ordersRouter.get('/:id', authMiddleware, async (c) => {
  const id = Number(c.req.param('id'));
  const user = c.get('user')!;
  const db = c.get('db');

  const order = await db.query.orders.findFirst({
    where: eq(orders.id, id),
    with: { items: true }
  });
  
  if (!order || (order.userId !== user.id && user.role !== 'admin')) {
    return c.json({ error: 'Not found or forbidden' }, 404);
  }
  
  return c.json(order);
});

// GET /api/orders - List user's orders (PAGINATED)
ordersRouter.get('/', authMiddleware, async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;
  
  const page = Number(c.req.query('page')) || 1;
  const limit = Number(c.req.query('limit')) || 20;
  const offset = (page - 1) * limit;

  if (user.role === 'admin') {
    const totalCountResult = await db.select({ count: sql`count(*)` }).from(orders);
    const total = totalCountResult[0].count as number;

    const allOrders = await db.query.orders.findMany({
      limit,
      offset,
      with: { items: true, user: { columns: { passwordHash: false } } }
    });
    
    return c.json({ data: allOrders, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } else {
    const totalCountResult = await db.select({ count: sql`count(*)` }).from(orders).where(eq(orders.userId, user.id));
    const total = totalCountResult[0].count as number;

    const userOrders = await db.query.orders.findMany({
      where: eq(orders.userId, user.id),
      limit,
      offset,
      with: { items: true }
    });

    return c.json({ data: userOrders, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  }
});

export { ordersRouter };
