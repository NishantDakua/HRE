import QRCode from 'qrcode';
import type { PrismaClient } from '@prisma/client';
import { ImageStoreError, uploadJpeg } from './images.js';

const HOUR = 60 * 60 * 1000;
const ACCEPTED = ['ACCEPTED', 'CONFIRMED', 'IN_USE', 'COMPLETED'];
const SEVERITY_RATE: Record<string, number> = { MINOR: 0.25, MODERATE: 0.5, SEVERE: 1 };

export class ContractError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type Line = { resourceId: string; title: string; quantity: number; agreedPrice: number; unitLabel: string };

function money(rentDue: number, damageDue: number, deposit: number) {
  const rent = Math.max(0, Math.round(rentDue));
  const damage = Math.min(Math.max(0, Math.round(damageDue)), Math.max(0, deposit - rent));
  return { rentDue: rent, damageDue: damage, refund: Math.max(0, deposit - rent - damage) };
}

export function quoteByNature(
  rentTotal: number,
  deposit: number,
  booked: number,
  body: { phase: 'RECEIPT' | 'RETURN'; nature: string; receivedQuantity?: number; damagedQuantity?: number; severity?: string; rentAlready: number }
) {
  if (body.phase === 'RECEIPT') {
    const unusable = Math.min(booked, Math.max(0, body.damagedQuantity ?? 0));
    const received = body.nature === 'SHORT_DELIVERY' || body.nature === 'OTHER'
      ? Math.min(booked, Math.max(0, body.receivedQuantity ?? booked))
      : Math.max(0, booked - unusable);
    const rentDue = booked ? Math.round((rentTotal * received) / booked) : 0;
    return money(rentDue, 0, deposit);
  }
  const rate = SEVERITY_RATE[body.severity ?? 'MINOR'] ?? 0.25;
  const unit = booked ? rentTotal / booked : 0;
  const damageDue = Math.round((body.damagedQuantity ?? 0) * unit * rate);
  return money(body.rentAlready, damageDue, deposit);
}

export async function ensureContracts(prisma: PrismaClient, bookingId: string) {
  const booking = await prisma.exchangeBooking.findUnique({
    where: { id: bookingId },
    include: { items: { include: { resource: true } } },
  });
  if (!booking || !ACCEPTED.includes(booking.status)) return;
  const byProvider = new Map<string, typeof booking.items>();
  for (const item of booking.items) {
    const list = byProvider.get(item.providerId) ?? [];
    list.push(item);
    byProvider.set(item.providerId, list);
  }
  for (const [providerId, items] of byProvider) {
    const existing = await prisma.exchangeContract.findUnique({ where: { bookingId_providerId: { bookingId, providerId } } });
    if (existing) continue;
    const lines: Line[] = items.map((item) => ({
      resourceId: item.resourceId,
      title: item.resource.title,
      quantity: item.quantity,
      agreedPrice: item.agreedPrice,
      unitLabel: item.resource.unitLabel,
    }));
    const rentTotal = lines.reduce((sum, line) => sum + line.agreedPrice * line.quantity, 0);
    const listedDeposit = items.reduce((sum, item) => sum + (item.resource.deposit ?? 0), 0);
    const deposit = Math.max(listedDeposit, rentTotal * 3);
    const terms = [...new Set(items.flatMap((item) => item.resource.conditions))];
    await prisma.exchangeContract.create({
      data: {
        bookingId,
        providerId,
        seekerId: booking.seekerId,
        lines,
        terms,
        cancellation: items[0]?.resource.cancellation ?? null,
        rentTotal,
        deposit,
      },
    });
  }
}

const OPEN_DEAL = new Set(['ACCEPTED', 'CONFIRMED', 'IN_USE', 'COMPLETED']);

export interface BookingProgress {
  status: 'CONFIRMED' | 'IN_USE' | 'COMPLETED';
  confirmedAt: string | null;
  dispatchedAt: string | null;
  completedAt: string | null;
}

/** Accept locks the booking. Dispatch puts it in use. Approving the return completes it. */
export async function syncBookingProgress(prisma: PrismaClient, bookingId: string): Promise<BookingProgress | null> {
  const booking = await prisma.exchangeBooking.findUnique({ where: { id: bookingId } });
  if (!booking || !OPEN_DEAL.has(booking.status)) return null;

  await ensureContracts(prisma, bookingId);
  const contracts = await prisma.exchangeContract.findMany({
    where: { bookingId },
    include: { signatures: true, disputes: true },
  });
  const confirmedAt = contracts.reduce<Date | null>((earliest, contract) => {
    return !earliest || contract.createdAt < earliest ? contract.createdAt : earliest;
  }, null);
  const dispatchTimes = contracts.flatMap((contract) =>
    contract.signatures.filter((signature) => signature.purpose === 'DISPATCH').map((signature) => signature.signedAt)
  );
  const dispatchedAt = dispatchTimes.sort((a, b) => a.getTime() - b.getTime())[0] ?? null;
  const returnSettled = (contract: (typeof contracts)[number]) =>
    Boolean(contract.providerApprovedAt) || contract.disputes.some((dispute) => dispute.phase === 'RETURN' && dispute.status === 'AGREED');
  const allReturned = contracts.length > 0 && contracts.every(returnSettled);
  const completedAt = allReturned
    ? contracts
        .map((contract) => contract.providerApprovedAt ?? contract.disputes.find((dispute) => dispute.phase === 'RETURN' && dispute.status === 'AGREED')?.createdAt ?? null)
        .filter((time): time is Date => time !== null)
        .sort((a, b) => b.getTime() - a.getTime())[0] ?? null
    : null;
  const status = allReturned ? 'COMPLETED' : dispatchTimes.length > 0 ? 'IN_USE' : 'CONFIRMED';
  if (status !== booking.status) {
    await prisma.exchangeBooking.update({ where: { id: bookingId }, data: { status } });
  }
  await prisma.exchangeOffer.updateMany({
    where: { bookingId, status: 'OPEN' },
    data: { status: 'ACCEPTED' },
  });
  return {
    status,
    confirmedAt: confirmedAt?.toISOString() ?? null,
    dispatchedAt: dispatchedAt?.toISOString() ?? null,
    completedAt: completedAt?.toISOString() ?? null,
  };
}

async function saveScan(dataUrl: string, contractId: string, purpose: string) {
  const match = dataUrl.match(/^data:image\/jpeg;base64,([A-Za-z0-9+/=\s]+)$/);
  if (!match) throw new ContractError(400, 'Upload a photo or scan of the signed page.');
  const buffer = Buffer.from(match[1].replace(/\s/g, ''), 'base64');
  if (buffer.length < 5_000 || buffer.length > 2_500_000) throw new ContractError(400, 'That scan could not be read. Take the photo again.');
  try {
    return await uploadJpeg(buffer, 'contracts', `${contractId}-${purpose.toLowerCase()}`);
  } catch (error) {
    if (error instanceof ImageStoreError) throw new ContractError(400, error.message);
    throw new ContractError(400, 'That signed page did not save. Take the photo again.');
  }
}

const include = { signatures: true, scans: true, disputes: { orderBy: { createdAt: 'asc' as const } } };

export async function presentContract(prisma: PrismaClient, id: string, origin: string, viewerId?: string) {
  const contract = await prisma.exchangeContract.findUnique({ where: { id }, include });
  if (!contract) return null;
  if (
    contract.arrivedAt &&
    !contract.seekerApprovedAt &&
    Date.now() > contract.arrivedAt.getTime() + HOUR &&
    !contract.disputes.some((dispute) => dispute.phase === 'RECEIPT')
  ) {
    contract.seekerApprovedAt = new Date(contract.arrivedAt.getTime() + HOUR);
    await prisma.exchangeContract.update({ where: { id: contract.id }, data: { seekerApprovedAt: contract.seekerApprovedAt } });
  }
  const [booking, provider, seeker] = await Promise.all([
    prisma.exchangeBooking.findUnique({ where: { id: contract.bookingId } }),
    prisma.exchangeBusiness.findUnique({ where: { id: contract.providerId } }),
    prisma.exchangeBusiness.findUnique({ where: { id: contract.seekerId } }),
  ]);
  const lines = contract.lines as Line[];
  const booked = lines.reduce((sum, line) => sum + line.quantity, 0);
  const dispatchSigned = contract.signatures.some((signature) => signature.purpose === 'DISPATCH');
  const receiptDispute = contract.disputes.find((dispute) => dispute.phase === 'RECEIPT');
  const returnDispute = contract.disputes.find((dispute) => dispute.phase === 'RETURN');
  const receiptSettled = Boolean(contract.seekerApprovedAt) || receiptDispute?.status === 'AGREED';
  const returnSettled = Boolean(contract.providerApprovedAt) || returnDispute?.status === 'AGREED';
  const phase = !dispatchSigned ? 'DISPATCH' : !receiptSettled ? 'RECEIPT' : !returnSettled ? 'RETURN' : 'CLOSED';
  const open = contract.disputes.find((dispute) => dispute.status === 'OPEN');
  const rentBase = receiptDispute ? receiptDispute.rentDue : contract.rentTotal;
  const figures = returnDispute
    ? { rentDue: returnDispute.rentDue, damageDue: returnDispute.damageDue, refund: returnDispute.refund, deposit: contract.deposit, locked: returnSettled && !open }
    : receiptDispute
      ? { rentDue: receiptDispute.rentDue, damageDue: receiptDispute.damageDue, refund: receiptDispute.refund, deposit: contract.deposit, locked: returnSettled }
      : { ...money(rentBase, 0, contract.deposit), deposit: contract.deposit, locked: phase === 'CLOSED' };
  const windowEnds = contract.arrivedAt ? new Date(contract.arrivedAt.getTime() + HOUR) : null;
  const windowOpen = Boolean(phase === 'RECEIPT' && windowEnds && Date.now() <= windowEnds.getTime() && !open);
  const qrDataUrl = await QRCode.toDataURL(`${origin}/handover/${contract.id}`, { margin: 1, width: 280 });
  return {
    id: contract.id,
    bookingId: contract.bookingId,
    ref: booking?.ref ?? '',
    title: booking?.title ?? '',
    provider: provider ? { id: provider.id, name: provider.name } : { id: contract.providerId, name: 'Provider' },
    seeker: seeker ? { id: seeker.id, name: seeker.name } : { id: contract.seekerId, name: 'Seeker' },
    lines,
    terms: contract.terms,
    cancellation: contract.cancellation,
    rentTotal: contract.rentTotal,
    deposit: contract.deposit,
    arrivedAt: contract.arrivedAt?.toISOString() ?? null,
    returnedAt: contract.returnedAt?.toISOString() ?? null,
    seekerApprovedAt: contract.seekerApprovedAt?.toISOString() ?? null,
    providerApprovedAt: contract.providerApprovedAt?.toISOString() ?? null,
    phase,
    booked,
    disputeWindowEndsAt: windowEnds?.toISOString() ?? null,
    windowOpen,
    signatures: contract.signatures.map((signature) => ({
      role: signature.role,
      purpose: signature.purpose,
      imageUrl: signature.imageUrl,
      signedAt: signature.signedAt.toISOString(),
    })),
    scans: contract.scans.map((scan) => ({ businessId: scan.businessId, role: scan.role, phase: scan.phase, scannedAt: scan.scannedAt.toISOString() })),
    disputes: contract.disputes.map((dispute) => ({
      id: dispute.id,
      openedById: dispute.openedById,
      phase: dispute.phase,
      nature: dispute.nature,
      fault: dispute.fault,
      reason: dispute.reason,
      note: dispute.note,
      receivedQuantity: dispute.receivedQuantity,
      damagedQuantity: dispute.damagedQuantity,
      severity: dispute.severity,
      status: dispute.status,
      seekerAgreed: dispute.seekerAgreed,
      providerAgreed: dispute.providerAgreed,
      rentDue: dispute.rentDue,
      damageDue: dispute.damageDue,
      refund: dispute.refund,
      createdAt: dispute.createdAt.toISOString(),
    })),
    settlement: figures,
    qrDataUrl,
    viewerRole: viewerId === contract.providerId ? 'PROVIDER' : viewerId === contract.seekerId ? 'SEEKER' : null,
    viewerHasScanned: viewerId ? contract.scans.some((scan) => scan.businessId === viewerId) : false,
  };
}

export { saveScan };
