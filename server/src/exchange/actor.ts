import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { clerkClient, clerkMiddleware, getAuth } from '@clerk/express';
import type { ExchangeBusiness, HRERole } from '@prisma/client';
import { prisma } from './db.js';

/**
 * One auth adapter for every API route. Clerk is the only identity:
 *   - no valid Clerk session            → 401 { code: 'UNAUTHENTICATED' }
 *   - signed in, no business yet        → 409 { code: 'ONBOARDING_REQUIRED' } (onboarding creates it)
 *   - signed in with a business         → req.ctx = { userId, businessId, role }
 * A business belongs to exactly one Clerk user (ExchangeBusiness.clerkUserId).
 */

export type SpareRole = HRERole;
export interface ActorContext {
  /** Clerk user id. */
  userId: string;
  businessId: string;
  /** Chosen at onboarding; businesses created before roles existed act as BOTH. */
  role: SpareRole;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      ctx?: ActorContext;
      actor?: ExchangeBusiness | null;
    }
  }
}

export const clerkConfigured = () => Boolean(process.env.CLERK_SECRET_KEY && process.env.CLERK_PUBLISHABLE_KEY);
export const authMode = (): 'clerk' | 'off' => (clerkConfigured() ? 'clerk' : 'off');

/** Clerk's request parsing, only when keys are configured (it throws without them). */
export const withClerk: RequestHandler = clerkConfigured() ? clerkMiddleware() : (_req: Request, _res: Response, next: NextFunction) => next();

/** The signed-in Clerk user id, or null. */
export function sessionUserId(req: Request): string | null {
  if (!clerkConfigured()) return null;
  return getAuth(req).userId ?? null;
}

/** The role stored for a Clerk user at onboarding (legacy User row); BOTH when none was recorded. */
export async function roleFor(clerkUserId: string): Promise<SpareRole> {
  const user = await prisma.user.findUnique({ where: { clerkUserId }, select: { hreRole: true, onboardingComplete: true } });
  return user?.onboardingComplete ? user.hreRole : 'BOTH';
}

/** Resolve (and cache on the request) the signed-in user's business, or null. */
export async function actorBusiness(req: Request): Promise<ExchangeBusiness | null> {
  if (req.actor !== undefined) return req.actor;
  const userId = sessionUserId(req);
  if (!userId) return (req.actor = null);
  const business = await prisma.exchangeBusiness.findUnique({ where: { clerkUserId: userId } });
  if (business) req.ctx = { userId, businessId: business.id, role: await roleFor(userId) };
  return (req.actor = business);
}

/** For handlers that act as a business: the business, or a 401/409 already sent. */
export async function requireActor(req: Request, res: Response) {
  if (!sessionUserId(req)) {
    res.status(401).json({ error: 'Not signed in', code: 'UNAUTHENTICATED' });
    return null;
  }
  const business = await actorBusiness(req);
  if (business) return business;
  res.status(409).json({ error: 'Set up your business to continue', code: 'ONBOARDING_REQUIRED' });
  return null;
}

export interface ClerkProfile {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
}

const profileCache = new Map<string, { at: number; profile: ClerkProfile }>();

/** Name and primary email from Clerk (cached for five minutes); null when Clerk can't be reached. */
export async function clerkProfile(userId: string): Promise<ClerkProfile | null> {
  const hit = profileCache.get(userId);
  if (hit && Date.now() - hit.at < 5 * 60_000) return hit.profile;
  try {
    const user = await clerkClient.users.getUser(userId);
    const primary = user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId) ?? user.emailAddresses[0];
    const profile: ClerkProfile = {
      id: user.id,
      email: primary?.emailAddress?.toLowerCase() ?? null,
      firstName: user.firstName,
      lastName: user.lastName,
      imageUrl: user.imageUrl ?? null,
    };
    profileCache.set(userId, { at: Date.now(), profile });
    return profile;
  } catch (error) {
    console.warn('Clerk user lookup failed:', error instanceof Error ? error.message : error);
    return null;
  }
}
