import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateRequest } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// Get current user
router.get('/me', authenticateRequest, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        hreRole: req.user.hreRole,
        businessId: req.user.businessId,
        onboardingComplete: req.user.onboardingComplete,
        business: req.user.business,
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Complete onboarding
router.post('/onboarding', authenticateRequest, async (req: Request, res: Response) => {
  try {
    const { hreRole, businessName, businessType, location, contactPhone } = req.body;

    if (!req.user || !req.user.email) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Create or get business
    let business;
    if (req.user.businessId) {
      // Update existing business
      business = await prisma.business.update({
        where: { id: req.user.businessId },
        data: {
          name: businessName,
          businessType,
          location,
          contactPhone,
        }
      });
    } else {
      // Create new business
      business = await prisma.business.create({
        data: {
          name: businessName,
          businessType,
          location,
          contactEmail: req.user.email,
          contactPhone,
        }
      });
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        hreRole,
        businessId: business.id,
        onboardingComplete: true,
      },
      include: { business: true }
    });

    // If provider, create provider profile
    if ((hreRole === 'PROVIDER' || hreRole === 'BOTH') && !business.providerProfile) {
      await prisma.providerProfile.create({
        data: {
          businessId: business.id,
        }
      });
    }

    res.json({
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        hreRole: updatedUser.hreRole,
        businessId: updatedUser.businessId,
        onboardingComplete: updatedUser.onboardingComplete,
        business: updatedUser.business,
      }
    });
  } catch (error) {
    console.error('Onboarding error:', error);
    res.status(500).json({ error: 'Onboarding failed' });
  }
});

// Update user profile
router.put('/profile', authenticateRequest, async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, phoneNumber } = req.body;

    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        firstName,
        lastName,
        phoneNumber,
      },
      include: { business: true }
    });

    res.json({
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        hreRole: updatedUser.hreRole,
        businessId: updatedUser.businessId,
        onboardingComplete: updatedUser.onboardingComplete,
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

export default router;
