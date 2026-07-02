import { Hono } from "hono";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { ExecutionContext } from "@cloudflare/workers-types";
import { cors } from "hono/cors";
import { Env } from "./types";
import { requestId } from 'hono/request-id';
import { etag } from 'hono/etag';
import { csrf } from 'hono/csrf';
import { every } from 'hono/combine';
// Import Routers
import { productsRouter } from "./routes/products";
import { usersRouter } from "./routes/users";
import { ordersRouter } from "./routes/orders";
import { authRouter } from "./routes/auth";
import { categoriesRouter } from "./routes/categories";
import { couponsRouter } from "./routes/coupons";
import { ticketsRouter } from "./routes/tickets";
import { reviewsRouter } from "./routes/reviews";
import { cartRouter } from "./routes/cart";
import { fraudRouter } from "./routes/fraud";
import { analyticsRouter } from "./routes/analytics";
import { getDb } from "./db";
import { abandonedCarts, users, orders, vouchRequests } from "./db/schema";
import { sendAbandonedCartEmail } from "./utils/email";
import { eq, isNull, and } from "drizzle-orm";

const app = new Hono<{ Bindings: Env; Variables: import("./types").AppVariables }>();

// Inject DB middleware
app.use("*", async (c, next) => {
  c.set("db", getDb(c.env));
  await next();
});

// Global Middleware Combined
app.use(
  '*',
  every(
    requestId(),
    secureHeaders(), // Blocks XSS, Clickjacking, adds HSTS
    cors({
      origin: ['https://vcc.cybercoderbd.com', 'https://shop.cybercoderbd.com', 'http://localhost:5173'],
      credentials: true,
    }),
    csrf({ origin: ['vcc.cybercoderbd.com', 'shop.cybercoderbd.com', 'localhost:5173'] }), // CSRF protection
    etag(), // Auto ETag generation for caching
    logger()
  )
);

// Global Error Handler (Security: Don't leak stack traces)
app.onError((err, c) => {
  console.error('Unhandled Exception:', err);
  
  if (err instanceof Error && err.name === 'HTTPException') {
    return c.json({ success: false, message: err.message }, (err as any).status || 500);
  }
  
  return c.json({ success: false, message: 'Internal Server Error' }, 500);
});

// Health Check
app.get("/api/health", (c) => c.json({ status: "ok", service: "Storefront API" }));

// Mount Routers
app.route("/api/products", productsRouter);
app.route("/api/users", usersRouter);
app.route("/api/orders", ordersRouter);
app.route("/api/auth", authRouter);
app.route("/api/categories", categoriesRouter);
app.route("/api/coupons", couponsRouter);
app.route("/api/tickets", ticketsRouter);
app.route("/api/reviews", reviewsRouter);
app.route("/api/cart", cartRouter);
app.route("/api/fraud", fraudRouter);
app.route("/api/analytics", analyticsRouter);

export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    const db = getDb(env);
    
    // Find carts that are older than 2 hours and haven't been recovered or emailed yet
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
    
    const cartsToEmail = await db.query.abandonedCarts.findMany({
      where: (carts, { eq, and, isNull, lt }) => and(
        eq(carts.recovered, false),
        isNull(carts.emailSentAt),
        lt(carts.updatedAt, twoHoursAgo)
      ),
      with: { user: { columns: { email: true, name: true } } }
    });

    for (const cart of cartsToEmail) {
      if (cart.user) {
        ctx.waitUntil(sendAbandonedCartEmail(env, cart.user.email, cart.user.name));
        await db.update(abandonedCarts).set({ emailSentAt: Date.now() }).where(eq(abandonedCarts.id, cart.id));
      }
    }

    // Process Vouch Requests
    const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
    
    const ordersToVouch = await db.query.orders.findMany({
      where: (orders, { eq, and, lt }) => and(
        eq(orders.status, 'completed'),
        lt(orders.createdAt, threeDaysAgo)
      ),
      with: { user: { columns: { email: true } } }
    });

    for (const order of ordersToVouch) {
      const existingVouch = await db.query.vouchRequests.findFirst({
        where: (vr, { eq }) => eq(vr.orderId, order.id)
      });

      if (!existingVouch && order.user) {
        const token = crypto.randomUUID();
        await db.insert(vouchRequests).values({
          userId: order.userId,
          orderId: order.id,
          token,
          rewarded: false
        });
        console.log(`Mock Email: Leave a review for your order to get $5! Token: ${token}, to: ${order.user.email}`);
      }
    }
  },
  async email(message: any, env: Env, ctx: ExecutionContext) {
    // Forward or log the incoming email
    console.log(`Received email from ${message.from} to ${message.to}`);
    // Example: save to database or auto-reply
  }
};
