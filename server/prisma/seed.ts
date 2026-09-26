import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import {
  bookings,
  businesses,
  notifications,
  offers,
  resources,
  savedSearches,
} from '../../client/src/lib/mock.ts';

dotenv.config({
  path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env'),
});

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Spare exchange data...');

  await prisma.exchangeReview.deleteMany();
  await prisma.exchangeOffer.deleteMany();
  await prisma.exchangeBookingItem.deleteMany();
  await prisma.exchangeBooking.deleteMany();
  await prisma.exchangeListing.deleteMany();
  await prisma.exchangeBusiness.deleteMany();
  await prisma.exchangeNotification.deleteMany();
  await prisma.exchangeSavedSearch.deleteMany();

  await prisma.exchangeBusiness.createMany({
    data: businesses.map((b) => ({
      id: b.id,
      name: b.name,
      type: b.type,
      area: b.area,
      address: b.address,
      lat: b.lat,
      lng: b.lng,
      rating: b.rating,
      reviewCount: b.reviewCount,
      responseRate: b.responseRate,
      avgResponseMins: b.avgResponseMins,
      fulfillmentRate: b.fulfillmentRate,
      verified: b.verified,
      joinedAt: new Date(b.joinedAt),
    })),
  });

  await prisma.exchangeListing.createMany({
    data: resources.map((r) => ({
      id: r.id,
      businessId: r.businessId,
      title: r.title,
      category: r.category,
      description: r.description,
      price: r.price,
      unit: r.unit,
      quantity: r.quantity,
      available: r.available,
      unitLabel: r.unitLabel,
      minRentalHours: r.minRentalHours,
      capacity: r.capacity ?? null,
      tags: r.tags,
      delivers: r.delivers,
      deliveryBase: r.deliveryBase ?? null,
      deliveryPerKm: r.deliveryPerKm ?? null,
      status: r.status,
      conditions: r.conditions ?? [],
      cancellation: r.cancellation ?? null,
      deposit: r.deposit ?? null,
    })),
  });

  for (const booking of bookings) {
    await prisma.exchangeBooking.create({
      data: {
        id: booking.id,
        ref: booking.ref,
        seekerId: booking.seekerId,
        title: booking.title,
        status: booking.status,
        startAt: new Date(booking.startAt),
        endAt: new Date(booking.endAt),
        total: booking.total,
        urgent: booking.urgent ?? false,
        note: booking.note ?? null,
        createdAt: new Date(booking.createdAt),
        items: {
          create: booking.items.map((item) => ({
            resourceId: item.resourceId,
            providerId: item.providerId,
            quantity: item.quantity,
            agreedPrice: item.agreedPrice,
          })),
        },
      },
    });
  }

  const covered = new Set(offers.map((offer) => offer.bookingId));
  const generated = bookings
    .filter((booking) => !covered.has(booking.id))
    .map((booking) => {
      const item = booking.items[0];
      const status =
        booking.status === 'PENDING'
          ? 'OPEN'
          : booking.status === 'REJECTED'
            ? 'REJECTED'
            : booking.status === 'CANCELLED'
              ? 'EXPIRED'
              : booking.status === 'COUNTERED'
                ? 'COUNTERED'
                : 'ACCEPTED';
      const created = new Date(booking.createdAt);
      return {
        id: `o-${booking.id}-1`,
        bookingId: booking.id,
        resourceId: item.resourceId,
        fromBusinessId: booking.seekerId,
        toBusinessId: item.providerId,
        round: 1,
        price: item.agreedPrice,
        quantity: item.quantity,
        message: booking.note ?? `Request for ${booking.title.toLowerCase()}.`,
        status,
        createdAt: created,
        expiresAt: new Date(created.getTime() + 24 * 60 * 60 * 1000),
      };
    });

  await prisma.exchangeOffer.createMany({
    data: [
      ...offers.map((offer) => ({
        id: offer.id,
        bookingId: offer.bookingId,
        resourceId: offer.resourceId,
        fromBusinessId: offer.fromBusinessId,
        toBusinessId: offer.toBusinessId,
        round: offer.round,
        price: offer.price,
        quantity: offer.quantity,
        message: offer.message,
        status: offer.status,
        createdAt: new Date(offer.createdAt),
        expiresAt: new Date(offer.expiresAt),
      })),
      ...generated,
    ],
  });

  await prisma.exchangeNotification.createMany({
    data: notifications.map((note) => ({
      id: note.id,
      title: note.title,
      body: note.body,
      createdAt: new Date(note.createdAt),
      read: note.read,
    })),
  });

  await prisma.exchangeSavedSearch.createMany({
    data: savedSearches.map((search) => ({
      id: search.id,
      name: search.name,
      query: search.query,
      createdAt: new Date(search.createdAt),
      newMatches: search.newMatches,
    })),
  });

  console.log(
    `Seeded ${businesses.length} businesses, ${resources.length} listings, ${bookings.length} bookings.`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
