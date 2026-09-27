import { Router, type Request, type Response } from 'express';
import { ContractError, ensureContracts, presentContract, quoteByNature, saveScan } from '../exchange/contracts.js';
import { prisma } from '../exchange/db.js';
import { requireActor } from '../exchange/actor.js';
const router: Router = Router();


function originOf(req: Request) {
  const browser = req.get('origin');
  if (browser && !browser.includes(':5173')) return browser;
  const configured = process.env.CLIENT_URL;
  if (configured && !configured.includes(':5173')) return configured;
  return 'http://localhost:3100';
}

async function loadParty(id: string, businessId: string) {
  const contract = await prisma.exchangeContract.findUnique({ where: { id }, include: { signatures: true, disputes: true } });
  if (!contract || (contract.seekerId !== businessId && contract.providerId !== businessId)) return null;
  return contract;
}

router.get('/bookings/:id/contracts', async (req, res) => {
  const actor = await requireActor(req, res);
  if (!actor) return;
  const booking = await prisma.exchangeBooking.findUnique({ where: { id: req.params.id }, include: { items: true } });
  if (!booking || (booking.seekerId !== actor.id && !booking.items.some((item) => item.providerId === actor.id))) {
    return res.status(404).json({ error: 'Booking not found' });
  }
  await ensureContracts(prisma, booking.id);
  const rows = await prisma.exchangeContract.findMany({ where: { bookingId: booking.id, OR: [{ seekerId: actor.id }, { providerId: actor.id }] } });
  const contracts = await Promise.all(rows.map((row) => presentContract(prisma, row.id, originOf(req), actor.id)));
  res.json(contracts.filter(Boolean));
});

router.get('/contracts/:id', async (req, res) => {
  const actor = await requireActor(req, res);
  if (!actor) return;
  const contract = await loadParty(req.params.id, actor.id);
  if (!contract) return res.status(404).json({ error: 'Contract not found' });
  res.json(await presentContract(prisma, contract.id, originOf(req), actor.id));
});

const RECEIPT_NATURES = ['SHORT_DELIVERY', 'DAMAGED_ON_ARRIVAL', 'WRONG_ITEMS', 'OTHER'];
const RETURN_NATURES = ['DAMAGED_ON_RETURN', 'MISSING_ON_RETURN', 'OTHER'];
const NATURE_LABEL: Record<string, string> = {
  SHORT_DELIVERY: 'Short delivery',
  DAMAGED_ON_ARRIVAL: 'Damaged on arrival',
  WRONG_ITEMS: 'Wrong items',
  DAMAGED_ON_RETURN: 'Damaged on return',
  MISSING_ON_RETURN: 'Missing on return',
  OTHER: 'Other',
};

function receiptSettled(contract: { seekerApprovedAt: Date | null; disputes: { phase: string; status: string }[] }) {
  return Boolean(contract.seekerApprovedAt) || contract.disputes.some((dispute) => dispute.phase === 'RECEIPT' && dispute.status === 'AGREED');
}

router.post('/contracts/:id/scan', async (req, res) => {
  const actor = await requireActor(req, res);
  if (!actor) return;
  const contract = await loadParty(req.params.id, actor.id);
  if (!contract) return res.status(404).json({ error: 'Contract not found' });
  if (!contract.signatures.some((signature) => signature.purpose === 'DISPATCH')) {
    return res.status(400).json({ error: 'The provider signs the contract when sending the order. A dispute is not raised at dispatch.' });
  }
  const role = actor.id === contract.providerId ? 'PROVIDER' : 'SEEKER';
  const phase = role === 'SEEKER' ? 'RECEIPT' : 'RETURN';
  if (phase === 'RETURN' && !receiptSettled(contract)) {
    return res.status(400).json({ error: 'The provider records the return after the seeker has received the order.' });
  }
  const already = await prisma.exchangeContractScan.findFirst({ where: { contractId: contract.id, businessId: actor.id, phase } });
  if (!already) {
    await prisma.exchangeContractScan.create({ data: { contractId: contract.id, businessId: actor.id, role, phase } });
  }
  if (phase === 'RECEIPT' && !contract.arrivedAt) {
    await prisma.exchangeContract.update({ where: { id: contract.id }, data: { arrivedAt: new Date() } });
  }
  if (phase === 'RETURN' && !contract.returnedAt) {
    await prisma.exchangeContract.update({ where: { id: contract.id }, data: { returnedAt: new Date() } });
  }
  res.json(await presentContract(prisma, contract.id, originOf(req), actor.id));
});

router.post('/contracts/:id/approve', async (req, res) => {
  const actor = await requireActor(req, res);
  if (!actor) return;
  const contract = await loadParty(req.params.id, actor.id);
  if (!contract) return res.status(404).json({ error: 'Contract not found' });
  if (contract.disputes.some((dispute) => dispute.status === 'OPEN')) {
    return res.status(400).json({ error: 'Agree the open dispute before approving this step.' });
  }
  const role = actor.id === contract.providerId ? 'PROVIDER' : 'SEEKER';
  if (role === 'SEEKER') {
    if (!contract.arrivedAt) return res.status(400).json({ error: 'Scan the QR when the order arrives, then approve it.' });
    if (Date.now() > contract.arrivedAt.getTime() + 60 * 60 * 1000) {
      return res.status(400).json({ error: 'The hour after arrival has passed.' });
    }
    await prisma.exchangeContract.update({ where: { id: contract.id }, data: { seekerApprovedAt: new Date() } });
  } else {
    if (!receiptSettled(contract)) return res.status(400).json({ error: 'The seeker has not finished receiving the order.' });
    if (!contract.returnedAt) return res.status(400).json({ error: 'Scan the QR when the goods come back, then approve them.' });
    await prisma.exchangeContract.update({ where: { id: contract.id }, data: { providerApprovedAt: new Date() } });
  }
  res.json(await presentContract(prisma, contract.id, originOf(req), actor.id));
});

router.post('/contracts/:id/sign', async (req, res) => {
  const actor = await requireActor(req, res);
  if (!actor) return;
  const contract = await loadParty(req.params.id, actor.id);
  if (!contract) return res.status(404).json({ error: 'Contract not found' });
  const purpose = req.body?.purpose === 'RECEIPT' ? 'RECEIPT' : 'DISPATCH';
  const role = actor.id === contract.providerId ? 'PROVIDER' : 'SEEKER';
  if (purpose === 'DISPATCH' && role !== 'PROVIDER') return res.status(403).json({ error: 'The provider signs at dispatch.' });
  if (purpose === 'RECEIPT' && role !== 'SEEKER') return res.status(403).json({ error: 'The seeker signs when the order is received.' });
  if (purpose === 'RECEIPT') {
    if (!contract.signatures.some((signature) => signature.purpose === 'DISPATCH')) {
      return res.status(400).json({ error: 'The provider has not signed the dispatch copy yet.' });
    }
    if (!contract.arrivedAt) return res.status(400).json({ error: 'Scan the contract QR when the order arrives, then sign.' });
    if (contract.disputes.some((dispute) => dispute.status === 'OPEN')) {
      return res.status(400).json({ error: 'Sign the hard copy after both sides agree on the open dispute.' });
    }
  }
  try {
    const imageUrl = await saveScan(String(req.body?.dataUrl ?? ''), contract.id, purpose);
    await prisma.exchangeContractSignature.upsert({
      where: { contractId_purpose: { contractId: contract.id, purpose } },
      create: { contractId: contract.id, role, purpose, imageUrl },
      update: { imageUrl, signedAt: new Date(), role },
    });
  } catch (error) {
    if (error instanceof ContractError) return res.status(error.status).json({ error: error.message });
    throw error;
  }
  res.json(await presentContract(prisma, contract.id, originOf(req), actor.id));
});

router.post('/contracts/:id/disputes', async (req, res) => {
  const actor = await requireActor(req, res);
  if (!actor) return;
  const contract = await loadParty(req.params.id, actor.id);
  if (!contract) return res.status(404).json({ error: 'Contract not found' });
  if (contract.disputes.some((dispute) => dispute.status === 'OPEN')) {
    return res.status(400).json({ error: 'A dispute is already open on this contract.' });
  }
  const role = actor.id === contract.providerId ? 'PROVIDER' : 'SEEKER';
  const phase = role === 'SEEKER' ? 'RECEIPT' : 'RETURN';
  if (!contract.signatures.some((signature) => signature.purpose === 'DISPATCH')) {
    return res.status(400).json({ error: 'No dispute is raised when the provider sends the order.' });
  }
  if (phase === 'RECEIPT') {
    if (contract.seekerApprovedAt || contract.disputes.some((dispute) => dispute.phase === 'RECEIPT')) {
      return res.status(400).json({ error: 'Receipt of this order is already settled.' });
    }
    if (!contract.arrivedAt || Date.now() > contract.arrivedAt.getTime() + 60 * 60 * 1000) {
      return res.status(400).json({ error: 'The seeker can raise a dispute only within one hour of the order arriving.' });
    }
  } else {
    if (!receiptSettled(contract)) return res.status(400).json({ error: 'The provider raises a dispute when the goods come back.' });
    if (!contract.returnedAt || contract.providerApprovedAt || contract.disputes.some((dispute) => dispute.phase === 'RETURN')) {
      return res.status(400).json({ error: 'Scan the QR on return before raising a dispute.' });
    }
  }
  const nature = String(req.body?.nature ?? '');
  if (!(phase === 'RECEIPT' ? RECEIPT_NATURES : RETURN_NATURES).includes(nature)) {
    return res.status(400).json({ error: 'Choose the nature of the dispute.' });
  }
  const note = String(req.body?.note ?? '').trim();
  if (note.length < 3) return res.status(400).json({ error: 'Say what happened.' });
  const lines = contract.lines as { quantity: number }[];
  const booked = lines.reduce((sum, line) => sum + line.quantity, 0);
  const receivedQuantity = req.body?.receivedQuantity === undefined ? null : Number(req.body.receivedQuantity);
  const damagedQuantity = req.body?.damagedQuantity === undefined ? null : Number(req.body.damagedQuantity);
  const needsReceived = phase === 'RECEIPT' && (nature === 'SHORT_DELIVERY' || nature === 'OTHER');
  const needsDamaged = nature === 'DAMAGED_ON_ARRIVAL' || nature === 'WRONG_ITEMS' || phase === 'RETURN';
  if (needsReceived && (receivedQuantity === null || receivedQuantity < 0 || receivedQuantity > booked)) {
    return res.status(400).json({ error: 'Enter how many units were usable.' });
  }
  if (needsDamaged && (damagedQuantity === null || damagedQuantity < 0 || damagedQuantity > booked)) {
    return res.status(400).json({ error: 'Enter how many units were affected.' });
  }
  const severity = nature === 'MISSING_ON_RETURN' ? 'SEVERE' : ['MINOR', 'MODERATE', 'SEVERE'].includes(req.body?.severity) ? req.body.severity : 'MINOR';
  const receiptAgreed = contract.disputes.find((dispute) => dispute.phase === 'RECEIPT' && dispute.status === 'AGREED');
  const figures = quoteByNature(contract.rentTotal, contract.deposit, booked, {
    phase,
    nature,
    receivedQuantity: receivedQuantity ?? undefined,
    damagedQuantity: damagedQuantity ?? undefined,
    severity,
    rentAlready: receiptAgreed?.rentDue ?? contract.rentTotal,
  });
  await prisma.exchangeDispute.create({
    data: {
      contractId: contract.id,
      openedById: actor.id,
      phase,
      nature,
      fault: role === 'SEEKER' ? 'PROVIDER' : 'SEEKER',
      reason: NATURE_LABEL[nature] ?? nature,
      note,
      receivedQuantity,
      damagedQuantity,
      severity: phase === 'RETURN' ? severity : null,
      seekerAgreed: role === 'SEEKER',
      providerAgreed: role === 'PROVIDER',
      ...figures,
    },
  });
  res.status(201).json(await presentContract(prisma, contract.id, originOf(req), actor.id));
});

router.post('/contracts/:id/disputes/:disputeId/agree', async (req, res) => {
  const actor = await requireActor(req, res);
  if (!actor) return;
  const contract = await loadParty(req.params.id, actor.id);
  if (!contract) return res.status(404).json({ error: 'Contract not found' });
  const dispute = contract.disputes.find((item) => item.id === req.params.disputeId);
  if (!dispute || dispute.status !== 'OPEN') return res.status(404).json({ error: 'Dispute not found' });
  const data = actor.id === contract.providerId ? { providerAgreed: true } : { seekerAgreed: true };
  const next = { ...dispute, ...data };
  await prisma.exchangeDispute.update({
    where: { id: dispute.id },
    data: { ...data, status: next.seekerAgreed && next.providerAgreed ? 'AGREED' : 'OPEN' },
  });
  res.json(await presentContract(prisma, contract.id, originOf(req), actor.id));
});

export default router;
