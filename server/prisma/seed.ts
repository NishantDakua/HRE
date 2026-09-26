import { PrismaClient, VerificationStatus, FulfillmentStatus, PaymentStatus, Resource } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data
  await prisma.message.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.review.deleteMany();
  await prisma.negotiationMessage.deleteMany();
  await prisma.negotiation.deleteMany();
  await prisma.bookingItem.deleteMany();
  await prisma.fulfillment.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.match.deleteMany();
  await prisma.requirementItem.deleteMany();
  await prisma.requirement.deleteMany();
  await prisma.resourceImage.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.resource.deleteMany();
  await prisma.providerProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.business.deleteMany();
  await prisma.category.deleteMany();
  await prisma.contactSubmission.deleteMany();

  // Create categories
  const categories = [];
  for (const data of [
    {
      name: 'Furniture',
      icon: 'Chair',
      description: 'Chairs, tables, sofas, beds'
    },
    {
      name: 'Catering & Kitchen',
      icon: 'ChefHat',
      description: 'Ovens, refrigeration, cooking equipment'
    },
    {
      name: 'Event Infrastructure',
      icon: 'Zap',
      description: 'Stages, lighting, sound, AV'
    },
    {
      name: 'Manpower',
      icon: 'Users',
      description: 'Chefs, waiters, security, housekeeping'
    },
    {
      name: 'Transportation',
      icon: 'Truck',
      description: 'Vans, trucks, logistics, delivery'
    },
    {
      name: 'Venues & Spaces',
      icon: 'Building2',
      description: 'Banquet halls, conference rooms'
    },
    {
      name: 'Accommodation',
      icon: 'Hotel',
      description: 'Hotel rooms, staff accommodation'
    },
    {
      name: 'Hospitality Supplies',
      icon: 'Package',
      description: 'Linen, toiletries, cleaning supplies'
    },
    {
      name: 'Technology',
      icon: 'Cpu',
      description: 'POS, Wi-Fi, digital signage'
    },
    {
      name: 'Services',
      icon: 'Wrench',
      description: 'Cleaning, laundry, maintenance'
    }
  ]) {
    categories.push(await prisma.category.create({ data }));
  }

  console.log('✓ Categories created');

  // Create businesses - Buyers
  const hotelSunrise = await prisma.business.create({
    data: {
      name: 'Hotel Sunrise',
      businessType: 'Hotel',
      location: 'Mumbai, Maharashtra',
      gstNumber: 'GST123456789',
      contactEmail: 'contact@hotelsunrise.com',
      contactPhone: '+91-22-1234-5678',
      description: 'Luxury 5-star hotel in downtown Mumbai',
      verificationStatus: VerificationStatus.VERIFIED,
      verificationProvider: 'mock-entitylocker',
      verifiedAt: new Date(),
      users: {
        create: {
          email: 'buyer@hotelsunrise.com',
          password: await bcrypt.hash('demo123', 10),
          firstName: 'Rajesh',
          lastName: 'Patel'
        }
      }
    }
  });

  const grandEvents = await prisma.business.create({
    data: {
      name: 'Grand Events',
      businessType: 'Event Management',
      location: 'Delhi, NCR',
      gstNumber: 'GST987654321',
      contactEmail: 'contact@grandevents.com',
      contactPhone: '+91-11-8765-4321',
      description: 'Professional event management and coordination',
      verificationStatus: VerificationStatus.VERIFIED,
      verificationProvider: 'mock-entitylocker',
      verifiedAt: new Date(),
      providerProfile: {
        create: {
          averageRating: 4.7,
          totalReviews: 86,
          responseTime: 3,
          fulfillmentRate: 95,
          completedTransactions: 142
        }
      }
    }
  });

  // Create provider businesses
  const royalCaterers = await prisma.business.create({
    data: {
      name: 'Royal Caterers',
      businessType: 'Catering',
      location: 'Mumbai, Maharashtra',
      gstNumber: 'GST111111111',
      contactEmail: 'contact@royalcaterers.com',
      contactPhone: '+91-22-5555-5555',
      description: 'Premium catering services for events',
      verificationStatus: VerificationStatus.VERIFIED,
      verificationProvider: 'mock-entitylocker',
      verifiedAt: new Date(),
      providerProfile: {
        create: {
          averageRating: 4.8,
          totalReviews: 45,
          responseTime: 2,
          fulfillmentRate: 98,
          completedTransactions: 156
        }
      }
    }
  });

  const urbanBanquets = await prisma.business.create({
    data: {
      name: 'Urban Banquets',
      businessType: 'Venue',
      location: 'Mumbai, Maharashtra',
      gstNumber: 'GST222222222',
      contactEmail: 'contact@urbanbanquets.com',
      contactPhone: '+91-22-4444-4444',
      description: 'Beautiful banquet spaces for corporate and social events',
      verificationStatus: VerificationStatus.VERIFIED,
      verificationProvider: 'mock-entitylocker',
      verifiedAt: new Date(),
      providerProfile: {
        create: {
          averageRating: 4.7,
          totalReviews: 38,
          responseTime: 4,
          fulfillmentRate: 96,
          completedTransactions: 89
        }
      }
    }
  });

  const metrohospitality = await prisma.business.create({
    data: {
      name: 'Metro Hospitality',
      businessType: 'Equipment Rental',
      location: 'Bangalore, Karnataka',
      gstNumber: 'GST333333333',
      contactEmail: 'contact@metrohospitality.com',
      contactPhone: '+91-80-3333-3333',
      description: 'Equipment rental and hospitality solutions',
      verificationStatus: VerificationStatus.VERIFIED,
      verificationProvider: 'mock-entitylocker',
      verifiedAt: new Date(),
      providerProfile: {
        create: {
          averageRating: 4.6,
          totalReviews: 52,
          responseTime: 3,
          fulfillmentRate: 94,
          completedTransactions: 203
        }
      }
    }
  });

  const eliteServices = await prisma.business.create({
    data: {
      name: 'Elite Services',
      businessType: 'Staffing',
      location: 'Bangalore, Karnataka',
      gstNumber: 'GST444444444',
      contactEmail: 'contact@eliteservices.com',
      contactPhone: '+91-80-2222-2222',
      description: 'Professional staffing and event management',
      verificationStatus: VerificationStatus.VERIFIED,
      verificationProvider: 'mock-entitylocker',
      verifiedAt: new Date(),
      providerProfile: {
        create: {
          averageRating: 4.9,
          totalReviews: 67,
          responseTime: 1,
          fulfillmentRate: 99,
          completedTransactions: 287
        }
      }
    }
  });

  const swiftLogistics = await prisma.business.create({
    data: {
      name: 'Swift Logistics',
      businessType: 'Logistics',
      location: 'Mumbai, Maharashtra',
      gstNumber: 'GST555555555',
      contactEmail: 'contact@swiftlogistics.com',
      contactPhone: '+91-22-6666-6666',
      description: 'Vans, trucks and refrigerated delivery for events',
      verificationStatus: VerificationStatus.VERIFIED,
      verificationProvider: 'mock-entitylocker',
      verifiedAt: new Date(),
      providerProfile: {
        create: {
          averageRating: 4.5,
          totalReviews: 29,
          responseTime: 2,
          fulfillmentRate: 97,
          completedTransactions: 118
        }
      }
    }
  });

  console.log('✓ Businesses created');

  const img = (id: string) => `https://images.unsplash.com/photo-${id}?w=800&q=80&auto=format&fit=crop`;

  // Listed oldest → newest; the homepage features the newest listings first.
  const resourceSpecs = [
    { business: metrohospitality, category: 0, name: 'Banquet Chairs - Premium Cushioned', description: 'High-quality cushioned banquet chairs, available in various colors', quantity: 2000, price: 150, unit: 'per chair', minQuantity: 50, image: '1617806118233-18e1de247200' },
    { business: urbanBanquets, category: 0, name: 'Round Banquet Tables', description: 'Round tables seating 8-10 guests, with linen on request', quantity: 300, price: 450, unit: 'per table', minQuantity: 10, image: '1511795409834-ef04bbd61622' },
    { business: royalCaterers, category: 1, name: 'Buffet Catering Service', description: 'Complete buffet catering service with trained staff', quantity: 500, price: 450, unit: 'per person', minQuantity: 50, image: '1414235077428-338989a2e8c0' },
    { business: metrohospitality, category: 2, name: 'Professional Sound System', description: 'Line-array speakers, mixers and wireless mics with technician', quantity: 25, price: 6000, unit: 'per day', minQuantity: 1, image: '1505373877841-8d25f7d46678' },
    { business: eliteServices, category: 3, name: 'Event Staffing - Trained Professionals', description: 'Coordinators, ushers and support staff for large events', quantity: 200, price: 800, unit: 'per person per day', minQuantity: 10, image: '1581299894007-aaa50297cf16' },
    { business: swiftLogistics, category: 4, name: 'Event Logistics Truck', description: '20ft truck with loading crew for furniture and equipment', quantity: 8, price: 9000, unit: 'per trip', minQuantity: 1, image: '1586528116311-ad8dd3c8310d' },
    { business: swiftLogistics, category: 4, name: 'Refrigerated Delivery Van', description: 'Temperature-controlled van for catering deliveries', quantity: 12, price: 4500, unit: 'per trip', minQuantity: 1, image: '1601584115197-04ecc0da31d7' },
    { business: urbanBanquets, category: 5, name: 'Grand Ballroom - Premium Venue', description: 'Ballroom for 1000 guests with stage and built-in AV', quantity: 1, price: 75000, unit: 'per day', minQuantity: 1, image: '1517248135467-4c7edcad34c4' },
    { business: hotelSunrise, category: 6, name: 'Deluxe Hotel Rooms', description: 'Spare room inventory for event guests and staff', quantity: 40, price: 5500, unit: 'per night', minQuantity: 1, image: '1611892440504-42a792e24d32' },
    { business: metrohospitality, category: 7, name: 'Premium Linen & Towels', description: 'Hotel-grade bed linen, towels and table linen sets', quantity: 1000, price: 120, unit: 'per set', minQuantity: 20, image: '1631049307264-da0ec9d70304' },
    { business: metrohospitality, category: 8, name: 'POS & Billing Systems', description: 'Portable POS terminals with billing software and Wi-Fi', quantity: 20, price: 1500, unit: 'per day', minQuantity: 1, image: '1556742049-0cfed4f6a45d' },
    { business: eliteServices, category: 9, name: 'Housekeeping & Cleaning Crew', description: 'Pre- and post-event cleaning and maintenance crews', quantity: 50, price: 2500, unit: 'per crew per day', minQuantity: 1, image: '1581578731548-c64695cc6952' },
    { business: eliteServices, category: 3, name: 'Hospitality Staff (10 Pax)', description: 'Team of 10 trained waiters and service staff', quantity: 30, price: 3500, unit: 'per team per day', minQuantity: 1, image: '1577219491135-ce391730fb2c' },
    { business: grandEvents, category: 2, name: 'LED Stage Lighting', description: 'Stage wash, moving heads and LED walls with operator', quantity: 40, price: 8500, unit: 'per day', minQuantity: 1, image: '1470229722913-7c0e2dbbafd3' },
    { business: royalCaterers, category: 1, name: 'Professional Kitchen Setup', description: 'Mobile commercial kitchen with ovens and refrigeration', quantity: 10, price: 12000, unit: 'per day', minQuantity: 1, image: '1600565193348-f74bd3c7ccdf' },
    { business: urbanBanquets, category: 5, name: 'Banquet Hall - Grand Palace', description: 'Banquet hall for 500 guests, ideal for weddings and conferences', quantity: 1, price: 25000, unit: 'per day', minQuantity: 1, image: '1464366400600-7168b8af9bc3' },
  ];

  const listedAt = Date.now() - resourceSpecs.length * 60_000;
  const resources: Resource[] = [];
  for (const [idx, spec] of resourceSpecs.entries()) {
    const resource = await prisma.resource.create({
      data: {
        businessId: spec.business.id,
        categoryId: categories[spec.category].id,
        name: spec.name,
        description: spec.description,
        quantity: spec.quantity,
        price: spec.price,
        unit: spec.unit,
        location: spec.business.location,
        serviceArea: spec.business.location.split(',')[0],
        minQuantity: spec.minQuantity,
        availability: 'AVAILABLE',
        createdAt: new Date(listedAt + idx * 60_000),
        images: { create: [{ imageUrl: img(spec.image), isPrimary: true }] },
        inventory: { create: { businessId: spec.business.id, available: spec.quantity } }
      }
    });
    resources.push(resource);
  }

  console.log('✓ Resources and inventory created');

  // Twelve months of completed bookings so procurement analytics have history.
  const now = new Date();
  const buyers = [hotelSunrise, grandEvents];
  for (let monthsAgo = 11; monthsAgo >= 0; monthsAgo--) {
    const growth = 1 + (11 - monthsAgo) * 0.08;
    for (const [buyerIdx, buyer] of buyers.entries()) {
      const createdAt = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 4 + buyerIdx * 10);
      const picks = [
        resources[(monthsAgo * 3 + buyerIdx) % resources.length],
        resources[(monthsAgo * 3 + buyerIdx + 5) % resources.length]
      ].filter((r) => r.businessId !== buyer.id);

      const items = picks.map((resource, itemIdx) => {
        const quantity =
          resource.quantity <= 1 ? 1 : Math.max(resource.minQuantity, Math.round(resource.quantity * (0.04 + itemIdx * 0.02) * growth));
        const agreedPrice = Math.round(resource.price * 0.95);
        const inFlight = monthsAgo === 0;
        const fulfillmentStatus = inFlight
          ? itemIdx === 0 ? FulfillmentStatus.IN_TRANSIT : FulfillmentStatus.PREPARING
          : monthsAgo % 5 === 1 && itemIdx === 1 ? FulfillmentStatus.DISPATCHED : FulfillmentStatus.DELIVERED;
        return {
          providerId: resource.businessId,
          resourceId: resource.id,
          quantity,
          agreedPrice,
          subtotal: quantity * agreedPrice,
          fulfillmentStatus,
          paymentStatus: fulfillmentStatus === FulfillmentStatus.DELIVERED ? PaymentStatus.RELEASED : PaymentStatus.SECURED,
          createdAt
        };
      });
      if (!items.length) continue;

      const firstResource = picks[0];
      const requirement = await prisma.requirement.create({
        data: {
          buyerId: buyer.id,
          categoryId: firstResource.categoryId,
          title: `${firstResource.name} for ${buyer.name}`,
          description: 'Event requirement fulfilled through HRE',
          location: buyer.location,
          requiredDate: new Date(createdAt.getTime() + 7 * 86_400_000),
          status: monthsAgo === 0 ? 'BOOKED' : 'COMPLETED',
          createdAt
        }
      });

      await prisma.booking.create({
        data: {
          buyerId: buyer.id,
          requirementId: requirement.id,
          status: monthsAgo === 0 ? 'CONFIRMED' : 'COMPLETED',
          totalAmount: items.reduce((s, i) => s + i.subtotal, 0),
          createdAt,
          items: { create: items }
        }
      });
    }
  }

  console.log('✓ Booking history created');

  console.log('✅ Database seeded successfully!');
  console.log('\nDemo Login Credentials:');
  console.log('Email: buyer@hotelsunrise.com');
  console.log('Password: demo123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
