import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { Env } from '../types';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword, verifyPassword, generateSessionToken } from '../utils/crypto';
import { authMiddleware, AuthUser } from '../middleware/auth';
import { sendWelcomeEmail, sendMagicLinkEmail } from '../utils/email';
import { turnstileMiddleware } from '../middleware/turnstile';
import { AppVariables } from '../types';

export const authRouter = new Hono<{ Bindings: Env; Variables: AppVariables }>();

// Register
authRouter.post(
  '/register',
  zValidator(
    'json',
    z.object({
      name: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(6),
      'cf-turnstile-response': z.string().optional(),
      ref: z.string().optional(),
    }).strict()
  ),
  turnstileMiddleware,
  async (c) => {
    const { name, email, password, ref } = c.req.valid('json');
    const db = c.get('db');

    // Check if user exists
    const existing = await db.select().from(users).where(eq(users.email, email)).get();
    if (existing) {
      return c.json({ error: 'Email already in use' }, 400);
    }

    // Resolve referredById if ref is provided
    let referredById: number | null = null;
    if (ref) {
      const referrer = await db.select().from(users).where(eq(users.affiliateCode, ref)).get();
      if (referrer) {
        referredById = referrer.id;
      }
    }

    const passwordHash = await hashPassword(password);
    
    // Generate a unique affiliate code (e.g. name prefix + random string)
    const randomString = Math.random().toString(36).substring(2, 8).toUpperCase();
    const affiliateCode = `${name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 4)}-${randomString}`;

    // Insert user
    const result = await db.insert(users).values({
      name,
      email,
      passwordHash,
      role: 'user', // default role
      affiliateCode,
      referredById,
    }).returning();

    const user = result[0];

    // Create session
    const token = generateSessionToken();
    const sessionData: AuthUser = { id: user.id, email: user.email, role: user.role as 'admin' | 'user' };
    
    // 7 days TTL (604800 seconds)
    await c.env.sessions.put(token, JSON.stringify(sessionData), { expirationTtl: 604800 });

    // Send Welcome Email asynchronously (don't block the response)
    c.executionCtx.waitUntil(sendWelcomeEmail(c.env, email, name));

    return c.json({ token, user: sessionData }, 201);
  }
);

// Login
authRouter.post(
  '/login',
  zValidator(
    'json',
    z.object({
      email: z.string().email(),
      password: z.string(),
      'cf-turnstile-response': z.string().optional(),
    }).strict()
  ),
  turnstileMiddleware,
  async (c) => {
    const { email, password } = c.req.valid('json');
    const db = c.get('db');

    const user = await db.select().from(users).where(eq(users.email, email)).get();
    if (!user) {
      return c.json({ error: 'Invalid email or password' }, 401);
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return c.json({ error: 'Invalid email or password' }, 401);
    }

    // Create session
    const token = generateSessionToken();
    const sessionData: AuthUser = { id: user.id, email: user.email, role: user.role as 'admin' | 'user' };
    
    await c.env.sessions.put(token, JSON.stringify(sessionData), { expirationTtl: 604800 });

    return c.json({ token, user: sessionData });
  }
);

// Logout
authRouter.post('/logout', authMiddleware, async (c) => {
  const authHeader = c.req.header('Authorization');
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    await c.env.sessions.delete(token);
  }
  return c.json({ success: true });
});

// Request Magic Link
authRouter.post(
  '/magic-link',
  zValidator(
    'json',
    z.object({ 
      email: z.string().email(),
      'cf-turnstile-response': z.string().optional()
    }).strict()
  ),
  turnstileMiddleware,
  async (c) => {
    const { email } = c.req.valid('json');
    const db = c.get('db');

    const user = await db.select().from(users).where(eq(users.email, email)).get();
    if (!user) {
      // Return success anyway to prevent email enumeration attacks
      return c.json({ success: true, message: 'If an account exists, a link was sent.' });
    }

    const token = generateSessionToken();
    const sessionData: AuthUser = { id: user.id, email: user.email, role: user.role as 'admin' | 'user' };
    
    // Magic link expires in 15 mins (900 seconds)
    await c.env.sessions.put(`magic:${token}`, JSON.stringify(sessionData), { expirationTtl: 900 });

    c.executionCtx.waitUntil(sendMagicLinkEmail(c.env, email, token));

    return c.json({ success: true, message: 'If an account exists, a link was sent.' });
  }
);

// Get current user profile
authRouter.get('/me', authMiddleware, async (c) => {
  const sessionUser = c.get('user');
  const db = c.get('db');
  
  const user = await db.select().from(users).where(eq(users.id, sessionUser.id)).get();
  if (!user) return c.json({ error: 'User not found' }, 404);
  
  return c.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    balanceUsd: user.balanceUsd,
    affiliateCode: user.affiliateCode
  });
});
