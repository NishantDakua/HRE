import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'secret-key';

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({
      where: { email },
      include: { business: true }
    });

    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET);
    res.json({
      user: { id: user.id, email, firstName: user.firstName, lastName: user.lastName },
      token,
      businessId: user.businessId
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName, businessName, businessType, location } = req.body;

    const business = await prisma.business.create({
      data: {
        name: businessName,
        businessType,
        location,
        contactEmail: email,
        contactPhone: '',
        users: {
          create: {
            email,
            password: await bcrypt.hash(password, 10),
            firstName,
            lastName,
            role: 'BUSINESS_OWNER'
          }
        }
      },
      include: { users: true }
    });

    const token = jwt.sign({ id: business.users[0].id }, JWT_SECRET);
    res.json({ success: true, token });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

export default router;
