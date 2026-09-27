import { Request, Response, NextFunction } from 'express';
import { clerkClient } from '@clerk/express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      clerkUserId?: string;
      user?: any;
    }
  }
}

/**
 * Find the HRE User linked to a Clerk identity, creating one from Clerk's
 * profile data on first sight. Shared by the auth middleware and anywhere
 * else (e.g. the chat assistant) that needs a real User.id from a Clerk
 * userId, so there's exactly one place this find-or-create logic lives.
 */
export const findOrCreateHREUser = async (clerkUserId: string) => {
  const existing = await prisma.user.findUnique({
    where: { clerkUserId },
    include: { business: true },
  });
  if (existing) return existing;

  const clerkUser = await clerkClient.users.getUser(clerkUserId);
  return prisma.user.create({
    data: {
      clerkUserId,
      email: clerkUser.emailAddresses[0]?.emailAddress || '',
      firstName: clerkUser.firstName || undefined,
      lastName: clerkUser.lastName || undefined,
      role: 'USER',
      hreRole: 'SEEKER',
    },
    include: { business: true },
  });
};

export const authenticateRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clerkUserId = req.auth?.userId;

    if (!clerkUserId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    req.clerkUserId = clerkUserId;
    const user = await findOrCreateHREUser(clerkUserId);

    req.user = user;
    req.userId = user.id;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
};

export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clerkUserId = req.auth?.userId;

    if (clerkUserId) {
      req.clerkUserId = clerkUserId;
      const user = await prisma.user.findUnique({
        where: { clerkUserId },
        include: { business: true },
      });

      if (user) {
        req.user = user;
        req.userId = user.id;
      }
    }

    next();
  } catch (error) {
    console.error('Optional auth error:', error);
    next();
  }
};

export const getCurrentHREUser = async (clerkUserId: string) => {
  return prisma.user.findUnique({
    where: { clerkUserId },
    include: {
      business: {
        include: {
          providerProfile: true,
        }
      }
    },
  });
};
