import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post('/', async (req: Request, res: Response) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    return res.status(400).json({ error: 'A valid email is required' });
  }

  try {
    const existing = await prisma.contactSubmission.findFirst({ where: { email, category: 'newsletter' } });
    if (!existing) {
      await prisma.contactSubmission.create({
        data: {
          name: 'Newsletter subscriber',
          email,
          subject: 'Newsletter signup',
          message: 'Subscribed from the website footer',
          category: 'newsletter',
        },
      });
    }
    res.status(201).json({ subscribed: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to subscribe' });
  }
});

export default router;
