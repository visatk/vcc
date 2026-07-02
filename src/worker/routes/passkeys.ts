import { Hono } from 'hono';
import { Env, AppVariables } from '../types';
import { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse } from '@simplewebauthn/server';
import { eq } from 'drizzle-orm';
import { passkeyCredentials, users } from '../db/schema';
import { authMiddleware } from '../middleware/auth';
import { generateSessionToken } from '../utils/crypto';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

export const passkeysRouter = new Hono<{ Bindings: Env; Variables: AppVariables }>();

const rpName = 'VCC Storefront';
const rpID = 'localhost'; // Should be dynamic in production based on c.req.url
const origin = 'http://localhost:5173'; // Should be dynamic in production

// ---------------------------------------------
// 1. Generate Registration Options (Must be logged in)
// ---------------------------------------------
passkeysRouter.get('/register/options', authMiddleware, async (c) => {
  const sessionUser = c.get('user');
  const db = c.get('db');

  const user = await db.select().from(users).where(eq(users.id, sessionUser.id)).get();
  if (!user) return c.json({ error: 'User not found' }, 404);

  // Get existing credentials to exclude them
  const existingCredentials = await db.select().from(passkeyCredentials).where(eq(passkeyCredentials.userId, user.id));

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userID: new Uint8Array(Buffer.from(user.id.toString())),
    userName: user.email,
    userDisplayName: user.name,
    attestationType: 'none',
    excludeCredentials: existingCredentials.map(cred => ({
      id: cred.id,
      transports: cred.transports ? JSON.parse(cred.transports) : undefined,
    })),
    authenticatorSelection: {
      residentKey: 'required',
      userVerification: 'preferred',
    },
  });

  // Store challenge in KV for verification
  await c.env.sessions.put(`challenge:register:${user.id}`, options.challenge, { expirationTtl: 300 }); // 5 minutes

  return c.json(options);
});

// ---------------------------------------------
// 2. Verify Registration Response (Must be logged in)
// ---------------------------------------------
passkeysRouter.post(
  '/register/verify',
  authMiddleware,
  zValidator('json', z.any()), // The response from navigator.credentials.create()
  async (c) => {
    const sessionUser = c.get('user');
    const db = c.get('db');
    const response = c.req.valid('json');

    const expectedChallenge = await c.env.sessions.get(`challenge:register:${sessionUser.id}`);
    if (!expectedChallenge) {
      return c.json({ error: 'Registration challenge expired or not found' }, 400);
    }

    try {
      const verification = await verifyRegistrationResponse({
        response,
        expectedChallenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
      });

      if (verification.verified && verification.registrationInfo) {
        const { credentialID, credentialPublicKey, credentialDeviceType, credentialBackedUp, counter } = verification.registrationInfo;

        const base64urlPublicKey = Buffer.from(credentialPublicKey).toString('base64url');
        
        await db.insert(passkeyCredentials).values({
          id: credentialID,
          userId: sessionUser.id,
          publicKey: base64urlPublicKey,
          counter: counter,
          deviceType: credentialDeviceType,
          backedUp: credentialBackedUp,
          transports: JSON.stringify(response.response.transports || []),
        });

        // Clean up challenge
        await c.env.sessions.delete(`challenge:register:${sessionUser.id}`);

        return c.json({ success: true });
      }
    } catch (error: any) {
      return c.json({ error: error.message }, 400);
    }

    return c.json({ error: 'Verification failed' }, 400);
  }
);

// ---------------------------------------------
// 3. Generate Authentication Options (No auth required)
// ---------------------------------------------
passkeysRouter.get('/auth/options', async (c) => {
  // Generate options that allow any valid credential for this RP
  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: 'preferred',
  });

  // Store challenge in KV with a random key and send it to the client
  // The client will need to send this challenge ID back, or we can use a cookie.
  // We will just store it with a unique ID and send it down.
  const challengeId = crypto.randomUUID();
  await c.env.sessions.put(`challenge:auth:${challengeId}`, options.challenge, { expirationTtl: 300 });

  return c.json({ options, challengeId });
});

// ---------------------------------------------
// 4. Verify Authentication Response (No auth required)
// ---------------------------------------------
passkeysRouter.post(
  '/auth/verify',
  zValidator('json', z.object({
    response: z.any(),
    challengeId: z.string(),
  })),
  async (c) => {
    const { response, challengeId } = c.req.valid('json');
    const db = c.get('db');

    const expectedChallenge = await c.env.sessions.get(`challenge:auth:${challengeId}`);
    if (!expectedChallenge) {
      return c.json({ error: 'Authentication challenge expired or not found' }, 400);
    }

    // Lookup the credential in the DB
    const credential = await db.select().from(passkeyCredentials).where(eq(passkeyCredentials.id, response.id)).get();
    
    if (!credential) {
      // The modern-web-guidance recommends calling `PublicKeyCredential.signalUnknownCredential()`
      // if the server does not know the credential. We return a specific error code to the client.
      return c.json({ error: 'Passkey not found. It may have been removed.', code: 'UNKNOWN_CREDENTIAL' }, 404);
    }

    try {
      const verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        authenticator: {
          credentialID: credential.id,
          credentialPublicKey: new Uint8Array(Buffer.from(credential.publicKey, 'base64url')),
          counter: credential.counter,
          transports: credential.transports ? JSON.parse(credential.transports) : undefined,
        },
      });

      if (verification.verified) {
        // Update the counter
        await db.update(passkeyCredentials)
          .set({ 
            counter: verification.authenticationInfo.newCounter,
            lastUsedAt: new Date()
          })
          .where(eq(passkeyCredentials.id, credential.id));

        // Delete the challenge
        await c.env.sessions.delete(`challenge:auth:${challengeId}`);

        // Get the user and create session
        const user = await db.select().from(users).where(eq(users.id, credential.userId)).get();
        if (!user) return c.json({ error: 'User not found' }, 404);

        const token = generateSessionToken();
        const sessionData = { id: user.id, email: user.email, role: user.role };
        
        // 7 days TTL
        await c.env.sessions.put(token, JSON.stringify(sessionData), { expirationTtl: 604800 });

        return c.json({ success: true, token, user: sessionData });
      }
    } catch (error: any) {
      return c.json({ error: error.message }, 400);
    }

    return c.json({ error: 'Authentication failed' }, 400);
  }
);
