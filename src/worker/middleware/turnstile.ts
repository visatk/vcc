import { Context, Next } from 'hono';
import { Env } from '../types';

interface TurnstileResponse {
  success: boolean;
  'error-codes'?: string[];
}

export async function turnstileMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  let token = c.req.header('X-Turnstile-Token');
  
  if (!token) {
    try {
      const body = await c.req.json();
      token = body['cf-turnstile-response'];
    } catch {
      // ignore
    }
  }

  if (!token) {
    return c.json({ error: 'CAPTCHA token missing' }, 403);
  }

  const ip = c.req.header('CF-Connecting-IP');
  
  try {
    const formData = new URLSearchParams();
    formData.append('secret', c.env.TURNSTILE_SECRET);
    formData.append('response', token);
    if (ip) formData.append('remoteip', ip);

    const result = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const data = await result.json() as TurnstileResponse;
    if (data.success !== true) {
      return c.json({ error: 'CAPTCHA verification failed' }, 403);
    }
  } catch (e) {
    return c.json({ error: 'CAPTCHA verification error' }, 403);
  }

  await next();
}
