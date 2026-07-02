import { Context, Next } from 'hono';
import { Env } from '../types';

export type AuthUser = {
  id: number;
  email: string;
  role: 'admin' | 'user';
};

export async function authMiddleware(c: Context<{ Bindings: Env; Variables: { user: AuthUser } }>, next: Next) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const token = authHeader.split(' ')[1];
  
  // Lookup session in KV
  const sessionStr = await c.env.sessions.get(token);
  if (!sessionStr) {
    return c.json({ error: 'Unauthorized or session expired' }, 401);
  }

  try {
    const user = JSON.parse(sessionStr) as AuthUser;
    c.set('user', user);
    await next();
  } catch (e) {
    return c.json({ error: 'Invalid session data' }, 401);
  }
}

export async function adminMiddleware(c: Context<{ Bindings: Env; Variables: { user: AuthUser } }>, next: Next) {
  const user = c.get('user');
  if (!user || user.role !== 'admin') {
    return c.json({ error: 'Forbidden: Admin access required' }, 403);
  }
  await next();
}
