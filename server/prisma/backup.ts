/**
 * Snapshot every Exchange* table to server/backups/<timestamp>.json before destructive work
 * (db:seed wipes and recreates exchange data). Restore by re-inserting the rows if needed.
 */
import 'dotenv/config';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const tables = [
  'exchangeBusiness',
  'exchangeListing',
  'exchangeListingPhoto',
  'exchangeBooking',
  'exchangeBookingItem',
  'exchangeOffer',
  'exchangeContract',
  'exchangeContractSignature',
  'exchangeContractScan',
  'exchangeDispute',
  'exchangeReview',
  'exchangeNotification',
  'exchangeSavedSearch',
] as const;

const dump: Record<string, unknown[]> = {};
for (const t of tables) dump[t] = await (prisma[t] as unknown as { findMany: () => Promise<unknown[]> }).findMany();
const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../backups');
mkdirSync(dir, { recursive: true });
const file = path.join(dir, `exchange-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
writeFileSync(file, JSON.stringify(dump, null, 2));
console.log(`Backed up ${Object.entries(dump).map(([t, rows]) => `${t}=${rows.length}`).join(' ')} → ${path.relative(process.cwd(), file)}`);
await prisma.$disconnect();
