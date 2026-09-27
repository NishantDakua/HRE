import { Request, Response, NextFunction } from 'express';
import { clerkClient, getAuth } from '@clerk/express';
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

export const authenticateRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clerkUserId = getAuth(req).userId;

    if (!clerkUserId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    req.clerkUserId = clerkUserId;

    // Find or create HRE user
    let user = await prisma.user.findUnique({
      where: { clerkUserId },
      include: { business: true },
    });

    if (!user) {
      // Create user from Clerk data
      const clerkUser = await clerkClient.users.getUser(clerkUserId);

      user = await prisma.user.create({
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
    }

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
    const clerkUserId = getAuth(req).userId;

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
