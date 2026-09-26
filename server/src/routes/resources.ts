import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { category, location, search } = req.query;
    const resources = await prisma.resource.findMany({
      where: {
        AND: [
          category ? { category: { name: { contains: category as string, mode: 'insensitive' } } } : {},
          location ? { location: { contains: location as string, mode: 'insensitive' } } : {},
          search ? { name: { contains: search as string, mode: 'insensitive' } } : {}
        ]
      },
      include: {
        business: { include: { providerProfile: true } },
        category: true,
        images: true
      },
      take: 50
    });

    res.json(resources);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch resources' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const resource = await prisma.resource.findUnique({
      where: { id: req.params.id },
      include: {
        business: { include: { providerProfile: true } },
        category: true,
        images: true
      }
    });

    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    res.json(resource);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch resource' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { businessId, categoryId, name, description, quantity, price, unit, location } = req.body;

    const resource = await prisma.resource.create({
      data: {
        businessId,
        categoryId,
        name,
        description,
        quantity,
        price,
        unit,
        location
      }
    });

    await prisma.inventory.create({
      data: {
        businessId,
        resourceId: resource.id,
        available: quantity
      }
    });

    res.json(resource);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create resource' });
  }
});

export default router;
