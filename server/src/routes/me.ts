import { randomUUID } from 'node:crypto';
import { Router, type NextFunction, type Request, type Response } from 'express';
import { z } from 'zod';
import type { ExchangeBusiness } from '@prisma/client';
import { prisma } from '../exchange/db.js';
import { clerkProfile, roleFor, sessionUserId, type SpareRole } from '../exchange/actor.js';
import { AREAS, AREA_CENTER, businessJson } from './exchange.js';

/**
 * The signed-in account.
 *   GET  /api/me          → 200 { user, business | null }  (no business yet is a normal state)
 *   POST /api/onboarding  → 201 { user, business }          (creates the caller's business)
 */
const router: Router = Router();

const wrap =
  (handler: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) =>
    handler(req, res).catch(next);

async function mePayload(userId: string, business: ExchangeBusiness | null) {
  const [profile, row] = await Promise.all([
    clerkProfile(userId),
    prisma.user.findUnique({ where: { clerkUserId: userId }, select: { email: true, firstName: true, lastName: true } }),
  ]);
  return {
    user: {
      id: userId,
      email: profile?.email ?? row?.email ?? null,
      firstName: profile?.firstName ?? row?.firstName ?? null,
      lastName: profile?.lastName ?? row?.lastName ?? null,
      imageUrl: profile?.imageUrl ?? null,
    },
    business: business ? { ...businessJson(business), role: await roleFor(userId) } : null,
  };
}

router.get(
  '/me',
  wrap(async (req, res) => {
    const userId = sessionUserId(req);
    if (!userId) return res.status(401).json({ error: 'Not signed in', code: 'UNAUTHENTICATED' });
    const business = await prisma.exchangeBusiness.findUnique({ where: { clerkUserId: userId } });
    res.json(await mePayload(userId, business));
  })
);

export const BUSINESS_TYPES = ['Hotel', 'Restaurant', 'Caterer', 'Banquet Hall'] as const;

const onboardingSchema = z.object({
  name: z.string().trim().min(2, 'Business name is too short').max(80),
  type: z.enum(BUSINESS_TYPES),
  area: z.enum(AREAS),
  address: z.string().trim().max(200).optional().default(''),
  role: z.enum(['SEEKER', 'PROVIDER', 'BOTH']),
});

router.post(
  '/onboarding',
  wrap(async (req, res) => {
    const userId = sessionUserId(req);
    if (!userId) return res.status(401).json({ error: 'Not signed in', code: 'UNAUTHENTICATED' });

    const parsed = onboardingSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid details', code: 'VALIDATION', issues: parsed.error.issues });
    }
    const input = parsed.data;

    // One business per account: a repeated submit returns what already exists.
    const existing = await prisma.exchangeBusiness.findUnique({ where: { clerkUserId: userId } });
    if (existing) return res.status(200).json(await mePayload(userId, existing));

    const profile = await clerkProfile(userId);
    if (!profile?.email) {
      return res.status(502).json({ error: 'Could not read your account from Clerk. Try again in a moment.', code: 'CLERK_UNAVAILABLE' });
    }
    // The legacy User table holds the chosen role; its email is unique, so a row owned by
    // another account means this address is already taken.
    const clash = await prisma.user.findUnique({ where: { email: profile.email }, select: { clerkUserId: true } });
    if (clash && clash.clerkUserId && clash.clerkUserId !== userId) {
      return res.status(409).json({ error: 'That email is already linked to another Spare account', code: 'EMAIL_IN_USE' });
    }

    const center = AREA_CENTER[input.area];
    const business = await prisma.$transaction(async (tx) => {
      const created = await tx.exchangeBusiness.create({
        data: {
          id: `b_${randomUUID().replace(/-/g, '').slice(0, 12)}`,
          name: input.name,
          type: input.type,
          area: input.area,
          address: input.address || `${input.area}, Mumbai`,
          lat: center.lat,
          lng: center.lng,
          rating: 0,
          reviewCount: 0,
          responseRate: 0,
          avgResponseMins: 0,
          fulfillmentRate: 0,
          verified: false,
          joinedAt: new Date(),
          clerkUserId: userId,
          ownerEmail: profile.email,
        },
      });
      const role: SpareRole = input.role;
      const user = { firstName: profile.firstName, lastName: profile.lastName, hreRole: role, onboardingComplete: true };
      if (clash) await tx.user.update({ where: { email: profile.email! }, data: { ...user, clerkUserId: userId } });
      else await tx.user.upsert({ where: { clerkUserId: userId }, create: { ...user, clerkUserId: userId, email: profile.email!, role: 'USER' }, update: user });
      return created;
    });

    res.status(201).json(await mePayload(userId, business));
  })
);

export default router;
