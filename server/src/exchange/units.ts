import { randomBytes } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import { readBarcodes } from 'zxing-wasm/reader';
import { ImageStoreError, uploadJpeg } from './images.js';

export class UnitError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type Phase = 'DISPATCH' | 'RECEIPT' | 'RETURN';

function pad(n: number) {
  return String(n).padStart(4, '0');
}

function newCode() {
  return randomBytes(5).toString('hex').toUpperCase();
}

async function syncAvailable(prisma: PrismaClient, listingId: string, delta: number) {
  if (!delta) return;
  const listing = await prisma.exchangeListing.findUnique({ where: { id: listingId } });
  if (!listing) return;
  const available = Math.max(0, Math.min(listing.quantity, listing.available + delta));
  await prisma.exchangeListing.update({ where: { id: listingId }, data: { available } });
}

/** Creates one row per owned unit. Opening the label sheet does this for listings that predate the codes. */
export async function ensureUnits(prisma: PrismaClient, listingId: string) {
  const listing = await prisma.exchangeListing.findUnique({ where: { id: listingId } });
  if (!listing) throw new UnitError(404, 'Resource not found');
  const target = Math.max(0, Math.round(listing.quantity));
  const existing = await prisma.exchangeUnit.findMany({ where: { listingId }, orderBy: { label: 'asc' } });
  if (existing.length < target) {
    const max = existing.reduce((n, unit) => Math.max(n, Number(unit.label) || 0), 0);
    const rows = [];
    for (let n = max + 1; rows.length < target - existing.length; n += 1) {
      rows.push({ code: newCode(), label: pad(n), listingId, status: 'IN_STOCK' });
    }
    for (let i = 0; i < rows.length; i += 100) {
      await prisma.exchangeUnit.createMany({ data: rows.slice(i, i + 100) });
    }
  } else if (existing.length > target) {
    const extra = existing.length - target;
    const removable = [...existing].reverse().filter((unit) => unit.status === 'IN_STOCK').slice(0, extra);
    if (removable.length) {
      await prisma.exchangeUnit.deleteMany({ where: { id: { in: removable.map((unit) => unit.id) } } });
    }
    const left = existing.length - removable.length;
    if (left !== listing.quantity) {
      await prisma.exchangeListing.update({ where: { id: listingId }, data: { quantity: left } });
    }
  }
  return prisma.exchangeUnit.findMany({
    where: { listingId },
    orderBy: { label: 'asc' },
    select: { id: true, code: true, label: true, status: true },
  });
}

export async function codesInImage(buffer: Buffer) {
  try {
    const results = await readBarcodes(new Uint8Array(buffer), {
      formats: ['QRCode'],
      tryHarder: true,
      maxNumberOfSymbols: 255,
    });
    return [...new Set(results.map((item) => item.text.trim()).filter(Boolean))];
  } catch {
    return [];
  }
}

function jpegBuffer(dataUrl: string) {
  const match = dataUrl.match(/^data:image\/jpeg;base64,([A-Za-z0-9+/=\s]+)$/);
  if (!match) throw new UnitError(400, 'Upload a JPEG photo of the labels.');
  const buffer = Buffer.from(match[1].replace(/\s/g, ''), 'base64');
  if (buffer.length < 1_000 || buffer.length > 4_000_000) {
    throw new UnitError(400, 'That photo could not be read. Take it again, or split the labels across more than one photo.');
  }
  return buffer;
}

async function readsFor(prisma: PrismaClient, contractId: string, phase: string) {
  const rows = await prisma.exchangeUnitRead.findMany({
    where: { contractId, phase },
    include: { unit: { select: { id: true, code: true, label: true, status: true, listingId: true } } },
  });
  return rows.map((row) => row.unit);
}

export async function unitSummary(prisma: PrismaClient, contractId: string) {
  const [dispatched, received, returned, damagedReads, photos] = await Promise.all([
    readsFor(prisma, contractId, 'DISPATCH'),
    readsFor(prisma, contractId, 'RECEIPT'),
    readsFor(prisma, contractId, 'RETURN'),
    prisma.exchangeUnitRead.findMany({
      where: { contractId, phase: { in: ['RECEIPT_DAMAGE', 'RETURN_DAMAGE'] } },
      include: { unit: { select: { code: true, label: true } } },
    }),
    prisma.exchangeHandoverPhoto.findMany({
      where: { contractId },
      orderBy: { createdAt: 'asc' },
      include: { reads: { include: { unit: { select: { code: true, label: true } } } } },
    }),
  ]);
  const receivedCodes = new Set(received.map((unit) => unit.code));
  const returnedCodes = new Set(returned.map((unit) => unit.code));
  return {
    dispatched: dispatched.map((unit) => ({ code: unit.code, label: unit.label, status: unit.status })),
    received: received.map((unit) => ({ code: unit.code, label: unit.label })),
    returned: returned.map((unit) => ({ code: unit.code, label: unit.label })),
    damaged: damagedReads.map((row) => ({
      code: row.unit.code,
      label: row.unit.label,
      phase: row.phase === 'RETURN_DAMAGE' ? 'RETURN' : 'RECEIPT',
    })),
    missingOnArrival: dispatched.filter((unit) => !receivedCodes.has(unit.code)).map((unit) => ({ code: unit.code, label: unit.label })),
    missingOnReturn: dispatched.filter((unit) => !returnedCodes.has(unit.code)).map((unit) => ({ code: unit.code, label: unit.label })),
    photos: photos.map((photo) => ({
      id: photo.id,
      phase: photo.phase,
      kind: photo.kind,
      imageUrl: photo.imageUrl,
      codes: photo.reads.map((read) => ({ code: read.unit.code, label: read.unit.label })),
    })),
  };
}

async function listingIdsFor(prisma: PrismaClient, contractId: string) {
  const contract = await prisma.exchangeContract.findUnique({ where: { id: contractId } });
  if (!contract) throw new UnitError(404, 'Contract not found');
  const lines = contract.lines as { resourceId: string; quantity: number }[];
  return {
    contract,
    booked: lines.reduce((sum, line) => sum + line.quantity, 0),
    resourceIds: new Set(lines.map((line) => line.resourceId)),
  };
}

export async function recordUnitPhoto(
  prisma: PrismaClient,
  contractId: string,
  actorId: string,
  phase: Phase,
  kind: 'LABEL' | 'DAMAGE',
  dataUrl: string,
  clientCodes: string[]
) {
  const { contract, booked, resourceIds } = await listingIdsFor(prisma, contractId);
  if (actorId !== contract.providerId && actorId !== contract.seekerId) throw new UnitError(404, 'Contract not found');
  const role = actorId === contract.providerId ? 'PROVIDER' : 'SEEKER';
  if (phase === 'DISPATCH' && role !== 'PROVIDER') throw new UnitError(403, 'The provider photographs the labels when the units leave.');
  if (phase === 'RECEIPT' && role !== 'SEEKER') throw new UnitError(403, 'The seeker photographs the labels that arrived.');
  if (phase === 'RETURN' && role !== 'PROVIDER') throw new UnitError(403, 'The provider photographs the labels that came back.');
  if (phase === 'DISPATCH') {
    const receiptReads = await prisma.exchangeUnitRead.count({ where: { contractId, phase: 'RECEIPT' } });
    if (receiptReads || contract.seekerApprovedAt) throw new UnitError(400, 'The seeker has already started receiving, so the dispatch set is closed.');
  }
  if (phase === 'RECEIPT') {
    if (contract.seekerApprovedAt) throw new UnitError(400, 'Receipt of this order is already settled.');
    if (contract.arrivedAt && Date.now() > contract.arrivedAt.getTime() + 60 * 60 * 1000) {
      throw new UnitError(400, 'The hour after arrival has passed.');
    }
  }
  if (phase === 'RETURN') {
    const receiptSettled = Boolean(contract.seekerApprovedAt) || (await prisma.exchangeDispute.findFirst({ where: { contractId, phase: 'RECEIPT', status: 'AGREED' } }));
    if (!receiptSettled) throw new UnitError(400, 'The provider checks the units when they come back.');
    if (contract.providerApprovedAt) throw new UnitError(400, 'The return is already settled.');
  }

  const buffer = jpegBuffer(dataUrl);
  const decoded = kind === 'LABEL' ? await codesInImage(buffer) : [];
  const wanted = [...new Set([...decoded, ...clientCodes.map((code) => code.trim())].filter(Boolean))];
  const units = wanted.length
    ? await prisma.exchangeUnit.findMany({ where: { code: { in: wanted } } })
    : [];
  const byCode = new Map(units.map((unit) => [unit.code, unit]));
  const unknown = wanted.filter((code) => !byCode.has(code) || !resourceIds.has(byCode.get(code)!.listingId));

  const accepted: { id: string; code: string; label: string }[] = [];
  const skipped: string[] = [];
  const already = new Set((await readsFor(prisma, contractId, phase)).map((unit) => unit.code));
  const damagePhase = phase === 'RETURN' ? 'RETURN_DAMAGE' : 'RECEIPT_DAMAGE';
  const seen = new Set((await readsFor(prisma, contractId, phase)).map((unit) => unit.id));

  if (kind === 'DAMAGE') {
    for (const code of wanted) {
      const unit = byCode.get(code);
      if (!unit || !resourceIds.has(unit.listingId)) continue;
      if (!seen.has(unit.id)) {
        skipped.push(code);
        continue;
      }
      accepted.push({ id: unit.id, code: unit.code, label: unit.label });
    }
  } else if (phase === 'DISPATCH') {
    let room = booked - already.size;
    for (const code of wanted) {
      const unit = byCode.get(code);
      if (!unit || !resourceIds.has(unit.listingId)) continue;
      if (already.has(unit.code)) continue;
      if (unit.status !== 'IN_STOCK') {
        skipped.push(code);
        continue;
      }
      if (room <= 0) {
        skipped.push(code);
        continue;
      }
      accepted.push({ id: unit.id, code: unit.code, label: unit.label });
      room -= 1;
    }
  } else {
    const sent = new Set((await readsFor(prisma, contractId, 'DISPATCH')).map((unit) => unit.id));
    for (const code of wanted) {
      const unit = byCode.get(code);
      if (!unit || !resourceIds.has(unit.listingId)) continue;
      if (already.has(unit.code)) continue;
      if (!sent.has(unit.id)) {
        skipped.push(code);
        continue;
      }
      accepted.push({ id: unit.id, code: unit.code, label: unit.label });
    }
  }

  let imageUrl: string;
  try {
    imageUrl = await uploadJpeg(buffer, 'units', `${contractId}-${phase.toLowerCase()}-${kind.toLowerCase()}-${Date.now().toString(36)}`);
  } catch (error) {
    if (error instanceof ImageStoreError) throw new UnitError(400, error.message);
    throw new UnitError(400, 'That photo did not save. Take it again.');
  }

  const photo = await prisma.exchangeHandoverPhoto.create({
    data: { contractId, phase, kind, imageUrl },
  });

  if (kind === 'LABEL' && accepted.length) {
    await prisma.exchangeUnitRead.createMany({
      data: accepted.map((unit) => ({ unitId: unit.id, photoId: photo.id, contractId, phase })),
    });
    if (phase === 'DISPATCH') {
      await prisma.exchangeUnit.updateMany({ where: { id: { in: accepted.map((unit) => unit.id) } }, data: { status: 'SENT' } });
      const byListing = new Map<string, number>();
      for (const unit of accepted) {
        const row = byCode.get(unit.code);
        if (!row) continue;
        byListing.set(row.listingId, (byListing.get(row.listingId) ?? 0) + 1);
      }
      for (const [listingId, count] of byListing) await syncAvailable(prisma, listingId, -count);
    } else if (phase === 'RECEIPT') {
      await prisma.exchangeUnit.updateMany({
        where: { id: { in: accepted.map((unit) => unit.id) }, status: { not: 'DAMAGED' } },
        data: { status: 'RECEIVED' },
      });
      if (!contract.arrivedAt) await prisma.exchangeContract.update({ where: { id: contractId }, data: { arrivedAt: new Date() } });
    } else {
      const damagedIds = new Set(
        (await prisma.exchangeUnit.findMany({ where: { id: { in: accepted.map((unit) => unit.id) }, status: 'DAMAGED' }, select: { id: true } })).map((unit) => unit.id)
      );
      const back = accepted.filter((unit) => !damagedIds.has(unit.id));
      if (back.length) {
        await prisma.exchangeUnit.updateMany({ where: { id: { in: back.map((unit) => unit.id) } }, data: { status: 'IN_STOCK' } });
        const byListing = new Map<string, number>();
        for (const unit of back) {
          const row = byCode.get(unit.code);
          if (!row) continue;
          byListing.set(row.listingId, (byListing.get(row.listingId) ?? 0) + 1);
        }
        for (const [listingId, count] of byListing) await syncAvailable(prisma, listingId, count);
      }
      if (!contract.returnedAt) await prisma.exchangeContract.update({ where: { id: contractId }, data: { returnedAt: new Date() } });
    }
  }

  if (kind === 'DAMAGE' && accepted.length) {
    const current = await prisma.exchangeUnit.findMany({ where: { id: { in: accepted.map((unit) => unit.id) } } });
    await prisma.exchangeUnitRead.createMany({
      data: accepted.map((unit) => ({ unitId: unit.id, photoId: photo.id, contractId, phase: damagePhase })),
      skipDuplicates: true,
    });
    await prisma.exchangeUnit.updateMany({ where: { id: { in: accepted.map((unit) => unit.id) } }, data: { status: 'DAMAGED' } });
    const byListing = new Map<string, number>();
    for (const unit of current) {
      if (unit.status !== 'IN_STOCK') continue;
      byListing.set(unit.listingId, (byListing.get(unit.listingId) ?? 0) + 1);
    }
    for (const [listingId, count] of byListing) await syncAvailable(prisma, listingId, -count);
  }

  return {
    accepted: accepted.map((unit) => ({ code: unit.code, label: unit.label })),
    unknown,
    skipped,
    photoUrl: imageUrl,
    summary: await unitSummary(prisma, contractId),
  };
}

/** Units that were sent and never seen in the closing photos leave the rentable stock. */
export async function markMissing(prisma: PrismaClient, contractId: string, phase: 'RECEIPT' | 'RETURN') {
  const summary = await unitSummary(prisma, contractId);
  const missing = phase === 'RECEIPT' ? summary.missingOnArrival : summary.missingOnReturn;
  if (!missing.length) return;
  await prisma.exchangeUnit.updateMany({
    where: { code: { in: missing.map((unit) => unit.code) }, status: { in: ['SENT', 'RECEIVED', 'DAMAGED'] } },
    data: { status: 'MISSING' },
  });
}
