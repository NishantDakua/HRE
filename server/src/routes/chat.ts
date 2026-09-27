import { Router } from 'express';
import { getAuth } from '@clerk/express';
import { z } from 'zod';
import { LLMUnavailableError, chat, getSession, resolveAction } from '../services/assistant.js';
import { actorBusiness } from './exchange.js';

const router = Router();

const ChatBody = z.object({
  sessionId: z.string().optional(),
  message: z.string().trim().min(1).max(2000),
  mode: z.enum(['seeker', 'provider']).default('seeker'),
});

const ConfirmBody = z.object({
  sessionId: z.string(),
  actionId: z.string(),
  decision: z.enum(['confirm', 'cancel']),
  mode: z.enum(['seeker', 'provider']).default('seeker'),
});

/** Streams NDJSON: {event:"session"}, then {event:"delta"} / {event:"block"} as they happen, then {event:"done"} or {event:"error"}. */
router.post('/', async (req, res) => {
  const body = ChatBody.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: 'message is required' });
  const actor = await actorBusiness(req);
  if (!actor) return res.status(401).json({ error: 'Sign in required' });
  const { id, session } = getSession(body.data.sessionId);
  // Digital Twin tools (weather/simulation) key off the real HRE User, not
  // the Exchange demo business — resolve it from the same Clerk session.
  const clerkUserId = getAuth(req).userId ?? undefined;

  res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.flushHeaders();
  const send = (payload: object) => res.write(`${JSON.stringify(payload)}\n`);
  send({ event: 'session', sessionId: id });
  try {
    await chat(session, body.data.message, body.data.mode, send, actor.id, clerkUserId);
    send({ event: 'done' });
  } catch (error) {
    if (error instanceof LLMUnavailableError) {
      console.error('Local LLM error:', error.message);
      send({ event: 'error', error: error.message });
    } else {
      console.error('Chat error:', error);
      send({ event: 'error', error: 'Assistant failed' });
    }
  }
  res.end();
});

router.post('/confirm', async (req, res) => {
  const body = ConfirmBody.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: 'sessionId, actionId and decision are required' });
  const actor = await actorBusiness(req);
  if (!actor) return res.status(401).json({ error: 'Sign in required' });
  const { id, session } = getSession(body.data.sessionId);
  if (id !== body.data.sessionId) return res.status(410).json({ error: 'This conversation expired. Start a new one.' });
  try {
    const outcome = await resolveAction(session, body.data.actionId, body.data.decision, body.data.mode, actor.id);
    if (!outcome) return res.status(409).json({ error: 'That card was already used' });
    res.json({ sessionId: id, ...outcome });
  } catch (error) {
    console.error('Confirm error:', error);
    res.status(500).json({ error: 'Could not complete that action' });
  }
});

export default router;
