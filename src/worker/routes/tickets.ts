import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { eq, desc } from 'drizzle-orm';
import { getDb } from '../db';
import { tickets, ticketMessages } from '../db/schema';
import { Env } from '../types';
import { authMiddleware, adminMiddleware, AuthUser } from '../middleware/auth';

const ticketsRouter = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

// GET /api/tickets - List tickets (Users see their own, Admins see all)
ticketsRouter.get('/', authMiddleware, async (c) => {
  const db = getDb(c.env);
  const user = c.get('user');

  if (user.role === 'admin') {
    const allTickets = await db.query.tickets.findMany({
      orderBy: [desc(tickets.updatedAt)],
      with: { user: { columns: { name: true, email: true } } }
    });
    return c.json(allTickets);
  } else {
    const userTickets = await db.query.tickets.findMany({
      where: eq(tickets.userId, user.id),
      orderBy: [desc(tickets.updatedAt)],
    });
    return c.json(userTickets);
  }
});

// GET /api/tickets/:id - View a single ticket & messages
ticketsRouter.get('/:id', authMiddleware, async (c) => {
  const id = Number(c.req.param('id'));
  const user = c.get('user');
  const db = getDb(c.env);

  const ticket = await db.query.tickets.findFirst({
    where: eq(tickets.id, id),
    with: {
      user: { columns: { name: true, email: true } },
      messages: {
        with: { sender: { columns: { name: true, role: true } } },
        orderBy: [desc(ticketMessages.createdAt)]
      }
    }
  });

  if (!ticket) return c.json({ error: 'Not found' }, 404);
  if (ticket.userId !== user.id && user.role !== 'admin') return c.json({ error: 'Forbidden' }, 403);

  return c.json(ticket);
});

// POST /api/tickets - Open a new ticket
ticketsRouter.post(
  '/',
  authMiddleware,
  zValidator('json', z.object({ subject: z.string().min(1), message: z.string().min(1) }).strict()),
  async (c) => {
    const { subject, message } = c.req.valid('json');
    const user = c.get('user');
    const db = getDb(c.env);

    try {
      const newTicket = await db.transaction(async (tx) => {
        const ticket = await tx.insert(tickets).values({
          userId: user.id,
          subject,
          status: 'open'
        }).returning().get();

        await tx.insert(ticketMessages).values({
          ticketId: ticket.id,
          senderId: user.id,
          message
        });

        return ticket;
      });

      return c.json(newTicket, 201);
    } catch (err) {
      return c.json({ success: false, message: 'Failed to create ticket' }, 500);
    }
  }
);

// POST /api/tickets/:id/messages - Reply to a ticket
ticketsRouter.post(
  '/:id/messages',
  authMiddleware,
  zValidator('json', z.object({ message: z.string().min(1) }).strict()),
  async (c) => {
    const ticketId = Number(c.req.param('id'));
    const { message } = c.req.valid('json');
    const user = c.get('user');
    const db = getDb(c.env);

    const ticket = await db.query.tickets.findFirst({ where: eq(tickets.id, ticketId) });
    if (!ticket) return c.json({ error: 'Not found' }, 404);
    if (ticket.userId !== user.id && user.role !== 'admin') return c.json({ error: 'Forbidden' }, 403);

    await db.transaction(async (tx) => {
      await tx.insert(ticketMessages).values({
        ticketId,
        senderId: user.id,
        message
      });

      await tx.update(tickets).set({
        updatedAt: new Date(),
        status: user.role === 'admin' ? 'resolved' : 'open' // Auto-update status
      }).where(eq(tickets.id, ticketId));
    });

    return c.json({ success: true }, 201);
  }
);

// PUT /api/tickets/:id/status - Update ticket status (Admin)
ticketsRouter.put(
  '/:id/status',
  authMiddleware,
  adminMiddleware,
  zValidator('json', z.object({ status: z.enum(['open', 'resolved', 'closed']) }).strict()),
  async (c) => {
    const ticketId = Number(c.req.param('id'));
    const { status } = c.req.valid('json');
    const db = getDb(c.env);

    await db.update(tickets).set({ status, updatedAt: new Date() }).where(eq(tickets.id, ticketId));
    return c.json({ success: true });
  }
);

export { ticketsRouter };
