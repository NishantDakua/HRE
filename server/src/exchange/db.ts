import { PrismaClient } from '@prisma/client';

/** One Prisma client for the whole API (each `new PrismaClient()` opens its own pool). */
export const prisma = new PrismaClient();
