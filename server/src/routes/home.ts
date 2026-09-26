import { Router, Request, Response } from 'express';
import { PrismaClient, VerificationStatus, FulfillmentStatus } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

const ALLOWED_MONTHS = [3, 6, 12];
const COMPLETED_STATUSES: FulfillmentStatus[] = [FulfillmentStatus.DELIVERED, FulfillmentStatus.CONFIRMED];

function monthStart(date: Date, offset: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1);
}

function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

async function procurementWindow(from: Date, to: Date) {
  const bookings = await prisma.booking.findMany({
    where: { createdAt: { gte: from, lt: to }, status: { not: 'CANCELLED' } },
    select: {
      createdAt: true,
      totalAmount: true,
      items: {
        select: {
          quantity: true,
          subtotal: true,
          providerId: true,
          fulfillmentStatus: true,
          resource: { select: { category: { select: { name: true } } } },
        },
      },
    },
  });

  const items = bookings.flatMap((b) => b.items);
  const completed = items.filter((i) => COMPLETED_STATUSES.includes(i.fulfillmentStatus)).length;

  return {
    bookings,
    totalSpend: bookings.reduce((s, b) => s + b.totalAmount, 0),
    resourcesAcquired: items.reduce((s, i) => s + i.quantity, 0),
    providersUsed: new Set(items.map((i) => i.providerId)).size,
    fulfillmentRate: items.length ? Math.round((completed / items.length) * 100) : 0,
  };
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const requested = Number(req.query.months);
    const months = ALLOWED_MONTHS.includes(requested) ? requested : 6;

    const now = new Date();
    const periodStart = monthStart(now, -(months - 1));
    const periodEnd = monthStart(now, 1);
    const previousStart = monthStart(now, -(2 * months - 1));

    const [categories, featured, verifiedBusinesses, providers, resourceCount, fulfillmentAvg, current, previous, locations] =
      await Promise.all([
        prisma.category.findMany({
          orderBy: { createdAt: 'asc' },
          include: {
            _count: { select: { resources: true } },
            resources: {
              take: 1,
              orderBy: { createdAt: 'asc' },
              select: { business: { select: { name: true, verificationStatus: true } } },
            },
          },
        }),
        prisma.resource.findMany({
          take: 8,
          where: { availability: 'AVAILABLE' },
          orderBy: { createdAt: 'desc' },
          include: {
            category: { select: { name: true } },
            images: { where: { isPrimary: true }, take: 1 },
            business: {
              select: {
                name: true,
                verificationStatus: true,
                providerProfile: { select: { averageRating: true, totalReviews: true } },
              },
            },
          },
        }),
        prisma.business.count({ where: { verificationStatus: VerificationStatus.VERIFIED } }),
        prisma.providerProfile.count(),
        prisma.resource.count(),
        prisma.providerProfile.aggregate({ _avg: { fulfillmentRate: true } }),
        procurementWindow(periodStart, periodEnd),
        procurementWindow(previousStart, periodStart),
        prisma.resource.findMany({ distinct: ['location'], select: { location: true }, orderBy: { location: 'asc' } }),
      ]);

    const monthly = Array.from({ length: months }, (_, idx) => {
      const start = monthStart(now, -(months - 1) + idx);
      const end = monthStart(now, -(months - 1) + idx + 1);
      const amount = current.bookings
        .filter((b) => b.createdAt >= start && b.createdAt < end)
        .reduce((s, b) => s + b.totalAmount, 0);
      return { label: start.toLocaleString('en-US', { month: 'short' }), amount };
    });

    const byCategory = new Map<string, number>();
    for (const item of current.bookings.flatMap((b) => b.items)) {
      const name = item.resource.category.name;
      byCategory.set(name, (byCategory.get(name) ?? 0) + item.subtotal);
    }
    const itemTotal = [...byCategory.values()].reduce((s, v) => s + v, 0);
    const categoryDistribution = [...byCategory.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, amount]) => ({ name, amount, share: itemTotal ? Math.round((amount / itemTotal) * 100) : 0 }));

    res.json({
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        icon: c.icon,
        description: c.description,
        resourceCount: c._count.resources,
        topProvider: c.resources[0]
          ? {
              name: c.resources[0].business.name,
              verified: c.resources[0].business.verificationStatus === VerificationStatus.VERIFIED,
            }
          : null,
      })),
      featured: featured.map((r) => ({
        id: r.id,
        name: r.name,
        category: r.category.name,
        provider: r.business.name,
        providerVerified: r.business.verificationStatus === VerificationStatus.VERIFIED,
        location: r.location,
        price: r.price,
        unit: r.unit,
        rating: r.business.providerProfile?.averageRating ?? null,
        reviews: r.business.providerProfile?.totalReviews ?? 0,
        imageUrl: r.images[0]?.imageUrl ?? null,
      })),
      locations: [...new Set(locations.map((l) => l.location.split(',')[0].trim()))],
      stats: {
        verifiedBusinesses,
        providers,
        resources: resourceCount,
        avgFulfillmentRate: Math.round(fulfillmentAvg._avg.fulfillmentRate ?? 0),
      },
      procurement: {
        months,
        totalSpend: current.totalSpend,
        resourcesAcquired: current.resourcesAcquired,
        providersUsed: current.providersUsed,
        fulfillmentRate: current.fulfillmentRate,
        deltas: {
          spend: percentChange(current.totalSpend, previous.totalSpend),
          resources: percentChange(current.resourcesAcquired, previous.resourcesAcquired),
          providers: percentChange(current.providersUsed, previous.providersUsed),
          fulfillment: previous.bookings.length ? current.fulfillmentRate - previous.fulfillmentRate : null,
        },
        monthly,
        categoryDistribution,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to load home data' });
  }
});

export default router;
