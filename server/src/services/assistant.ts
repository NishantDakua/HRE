import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import {
  ACTIVE,
  AREAS,
  CATEGORIES,
  createBooking,
  findMatches,
  listBookings,
  prisma,
  rentalUnits,
  respondToBooking,
  type BookingDetail,
  type CreateBookingInput,
  type RespondInput,
} from './exchange.js';
import { findOrCreateHREUser } from '../middleware/auth.js';
import { getCurrentWeather } from './digitalTwin/weatherService.js';
import { runSimulation } from './digitalTwin/simulationService.js';

const LLM_TIMEOUT_MS = 180_000;
const NUGEN_CHAT_URL = 'https://api.nugen.in/api/v3/inference/chat/completions';
const MAX_TOOL_ROUNDS = 6;
const SESSION_TTL_MS = 2 * 60 * 60 * 1000;

export type Mode = 'seeker' | 'provider';

export interface MatchCard {
  resourceId: string;
  title: string;
  category: string;
  provider: string;
  area: string;
  verified: boolean;
  rating: number;
  distanceKm: number;
  price: number;
  unit: string;
  unitLabel: string;
  available: number;
  fulfils: number;
  delivery: number;
  landed: number;
  matchScore: number;
}

export interface BookingCard {
  bookingId: string;
  ref: string;
  title: string;
  status: string;
  counterpart: string;
  startAt: string;
  endAt: string;
  total: number;
  lastOffer?: { round: number; price: number; from: 'you' | 'them'; message: string; status: string };
}

export interface ConfirmCard {
  actionId: string;
  kind: 'book' | 'respond';
  title: string;
  lines: string[];
  total?: number;
}

export type UIBlock =
  | { type: 'text'; text: string }
  | { type: 'options'; quantity: number; startAt: string; endAt: string; matches: MatchCard[] }
  | { type: 'confirm'; action: ConfirmCard }
  | { type: 'bookings'; role: Mode; bookings: BookingCard[] }
  | { type: 'result'; ok: boolean; text: string; bookingId?: string };

type PendingAction =
  | { kind: 'book'; card: ConfirmCard; input: CreateBookingInput }
  | { kind: 'respond'; card: ConfirmCard; bookingId: string; input: RespondInput };

interface LLMToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

type LLMMessage =
  | { role: 'system' | 'user' | 'tool'; content: string }
  | { role: 'assistant'; content: string; tool_calls?: LLMToolCall[] };

interface Session {
  messages: LLMMessage[];
  pending: Map<string, PendingAction>;
  lastSeen: number;
  lastSearch?: { quantity: number; startAt: string; endAt: string; matches: MatchCard[] };
}

const sessions = new Map<string, Session>();

export function getSession(id: string | undefined): { id: string; session: Session } {
  const now = Date.now();
  for (const [key, s] of sessions) if (now - s.lastSeen > SESSION_TTL_MS) sessions.delete(key);
  const existing = id ? sessions.get(id) : undefined;
  if (existing && id) {
    existing.lastSeen = now;
    return { id, session: existing };
  }
  const fresh: Session = { messages: [], pending: new Map(), lastSeen: now };
  const newId = randomUUID();
  sessions.set(newId, fresh);
  return { id: newId, session: fresh };
}

/* ------------------------------------------------------------------ */
/* Prompt + tools                                                      */
/* ------------------------------------------------------------------ */

const SYSTEM_PROMPT = `You are the booking assistant inside Spare, a marketplace where hospitality businesses in Mumbai rent idle resources from each other: banquet space, chairs & tables, vehicles, kitchen capacity, AV equipment, parking, and linen & decor.

The person chatting is the company that is signed in. Seeker mode means they want to rent. Provider mode means they are answering requests for their own listings. Never address them as Carter Road Kitchen, Marol Central Kitchen, or any other name you were not given. Each user message starts with a <context> tag giving the current time (Asia/Kolkata) and mode.

How to help a seeker:
- Work out what they need, how many, when (start and end), and where. If something essential is missing, ask a short follow-up question — one or two at a time, conversationally, not as a form. Budget and urgency are optional; ask only when they'd change the answer. Sensible assumptions are fine if you state them (e.g. "I'll assume 6–11 pm").
- As soon as you know what, how many, and when (an area is optional), call search_resources straight away — don't ask about budget or anything else first. The results already appear to the user as cards with a Book button, so do NOT list the options. Reply in two or three sentences: name the best one and why (fit, distance, landed price, reliability), then ask if they want to book it. If one provider can't cover the full quantity, say so and suggest combining two.
- To book, call propose_booking. It does NOT book anything; it shows the user a confirm card, and only their tap on Confirm sends the request. Never say something is booked or sent until you receive an [action result] message saying so.
- Negotiation: if the user wants a lower price, pass offerPrice in propose_booking; the provider can accept or counter. Before proposing, briefly counter-check anything that looks off (quantity above what's available, a time window shorter than the listing's minimum hours, a price far below list).
- For multi-item needs (e.g. chairs and projectors), handle one item at a time and then offer to do the next.

How to help a provider:
- Use list_bookings with role "provider" to see incoming requests, and propose_offer_response to accept, decline, or counter. Those also go through the user's confirm card.

Seekers can also check on their own requests with list_bookings (role "seeker") and respond to a provider's counter-offer with propose_offer_response.

Weather & Digital Twin (separate from the marketplace above):
- If the user asks about weather, or a "what if it rains / storms / gets hot" question, call get_current_weather first to ground your answer in real current conditions for that city.
- To answer "what happens to fulfillment if weather changes", call run_weather_simulation with the hypothetical rainfall/temperature/wind they described (reasonable defaults if they only mention one thing, e.g. just "heavy rain" → rainfall 80). This is a READ-ONLY projection — it never touches real bookings, inventory, or payments. Say plainly that the numbers are simulated/projected, not something that has actually happened.
- Report the projected fulfillment %, which providers are at highest risk, and how many units are at risk. If risk is high, you may suggest checking the marketplace for alternative providers via search_resources — but don't book anything automatically.

Rules for tools:
- Only use resourceId and bookingId values that appeared in a tool result or in the user's message. Never make one up; search first if you don't have it.
- When the user taps Book on a card, their message names the listing and its id — reuse the time window and quantity from the search unless they say otherwise.
- Resolve relative dates ("tomorrow", "this Saturday", "tonight") from the current time in <context>, and pass timestamps in local time like 2026-10-03T18:00.
- If a tool returns an error, fix the input and try again, or ask the user.
- When you call a tool, write at most one short sentence before it (or none). Put the call in this exact form and nothing else inside the tag:
<tool_call>
{"name":"search_resources","arguments":{"category":"CHAIRS_TABLES","quantity":150,"startAt":"2026-10-03T18:00","endAt":"2026-10-03T23:00","area":"Andheri"}}
</tool_call>
- Never show ids (resourceId, bookingId) to the user; refer to listings by name.

Style: short, warm, practical. Always reply in English. Your replies may be read aloud, so avoid markdown tables, headings, and long bullet lists. Use ₹ for prices.`;

// Small local models often send numbers as strings, omit the timezone, or send null for optional
// fields, so inputs are coerced and normalised here rather than rejected.
const optional = <T extends z.ZodTypeAny>(schema: T) => z.preprocess((v) => (v === null || v === '' ? undefined : v), schema.optional());
const count = z.coerce.number().int().positive();
const rupees = z.coerce.number().positive();
const bool = z.union([z.boolean(), z.enum(['true', 'false']).transform((v) => v === 'true')]);
const istTimestamp = z
  .string()
  .transform((s) => (/(Z|[+-]\d{2}:?\d{2})$/.test(s.trim()) ? s.trim() : `${s.trim()}+05:30`))
  .refine((s) => !Number.isNaN(Date.parse(s)), 'must be a local timestamp like 2026-10-03T18:00')
  .transform((s) => new Date(s).toISOString());
const upperEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z.preprocess((v) => (typeof v === 'string' ? v.trim().toUpperCase().replace(/[\s&-]+/g, '_') : v), z.enum(values));

const SearchInput = z.object({
  category: upperEnum(CATEGORIES),
  quantity: count,
  startAt: istTimestamp,
  endAt: istTimestamp,
  area: optional(z.enum(AREAS)),
  budget: optional(rupees),
  urgent: optional(bool),
});

const ProposeBookingInput = z.object({
  resourceId: z.string().min(1),
  quantity: count,
  startAt: istTimestamp,
  endAt: istTimestamp,
  offerPrice: optional(rupees),
  title: optional(z.string().max(80)),
  note: optional(z.string().max(200)),
});

const ListBookingsInput = z.object({ role: z.preprocess((v) => (typeof v === 'string' ? v.toLowerCase() : v), z.enum(['seeker', 'provider'])) });

const ProposeResponseInput = z.object({
  bookingId: z.string().min(1),
  action: z.preprocess((v) => (typeof v === 'string' ? v.toLowerCase() : v), z.enum(['accept', 'reject', 'counter'])),
  price: optional(rupees),
  message: optional(z.string().max(200)),
});

// Cities the Digital Twin tools know coordinates for — matches the picker on
// the /digital-twin page so a chat query and the page agree on the same spot.
const WEATHER_CITIES: Record<string, { lat: number; lng: number }> = {
  thane: { lat: 19.2183, lng: 72.9781 },
  mumbai: { lat: 19.076, lng: 72.8777 },
  pune: { lat: 18.5204, lng: 73.8567 },
  delhi: { lat: 28.6139, lng: 77.209 },
  bengaluru: { lat: 12.9716, lng: 77.5946 },
  bangalore: { lat: 12.9716, lng: 77.5946 },
  chennai: { lat: 13.0827, lng: 80.2707 },
  kolkata: { lat: 22.5726, lng: 88.3639 },
};
const cityCoords = (location: string) => WEATHER_CITIES[location.trim().toLowerCase()] ?? WEATHER_CITIES.thane;

const GetWeatherInput = z.object({ location: z.string().min(1) });
const RunWeatherSimulationInput = z.object({
  location: z.string().min(1),
  rainfall: z.coerce.number().min(0).max(500),
  stormDuration: optional(z.coerce.number().min(0).max(24)),
  temperature: z.coerce.number().min(-50).max(60),
  windSpeed: z.coerce.number().min(0).max(200),
});

const isoProp = (description: string) => ({ type: 'string', description: `${description}, local time as YYYY-MM-DDTHH:MM, e.g. 2026-10-03T18:00` });

interface ToolSpec {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

const TOOL_SPECS: ToolSpec[] = [
  {
    name: 'search_resources',
    description:
      'Find and rank listings that can cover a requirement. Results are shown to the user as bookable cards and returned to you as JSON (best match first).',
    parameters: {
      type: 'object',
      properties: {
        category: { type: 'string', enum: [...CATEGORIES] },
        quantity: { type: 'integer', minimum: 1, description: 'Units needed (chairs, vans, halls...)' },
        startAt: isoProp('Start of the rental window'),
        endAt: isoProp('End of the rental window'),
        area: { type: 'string', enum: [...AREAS], description: 'Where the resource is needed; ranks by distance from here' },
        budget: { type: 'number', description: 'Total budget in rupees for this item' },
        urgent: { type: 'boolean', description: 'Weights distance and reliability over price' },
      },
      required: ['category', 'quantity', 'startAt', 'endAt'],
    },
  },
  {
    name: 'propose_booking',
    description:
      'Show the user a confirm card for a booking request on one listing. Nothing is sent to the provider until the user taps Confirm; you will then get an [action result] message.',
    parameters: {
      type: 'object',
      properties: {
        resourceId: { type: 'string' },
        quantity: { type: 'integer', minimum: 1 },
        startAt: isoProp('Start'),
        endAt: isoProp('End'),
        offerPrice: { type: 'number', description: 'Offered price per unit in rupees; omit to pay list price' },
        title: { type: 'string', description: 'Short event title, e.g. "Rooftop launch"' },
        note: { type: 'string', description: 'Message to the provider' },
      },
      required: ['resourceId', 'quantity', 'startAt', 'endAt'],
    },
  },
  {
    name: 'list_bookings',
    description:
      "List the user's booking requests. role 'seeker' = requests they sent; role 'provider' = requests they received. Shown to the user as cards.",
    parameters: {
      type: 'object',
      properties: { role: { type: 'string', enum: ['seeker', 'provider'] } },
      required: ['role'],
    },
  },
  {
    name: 'propose_offer_response',
    description:
      'Show the user a confirm card to accept, reject, or counter an open booking request (by bookingId from list_bookings). Counter needs a price per unit.',
    parameters: {
      type: 'object',
      properties: {
        bookingId: { type: 'string' },
        action: { type: 'string', enum: ['accept', 'reject', 'counter'] },
        price: { type: 'number', description: 'Counter price per unit in rupees' },
        message: { type: 'string' },
      },
      required: ['bookingId', 'action'],
    },
  },
  {
    name: 'get_current_weather',
    description: 'Get live current weather for a city (Digital Twin data, separate from the marketplace). Use this before answering any weather question.',
    parameters: {
      type: 'object',
      properties: { location: { type: 'string', description: 'City name, e.g. "Thane", "Mumbai", "Pune"' } },
      required: ['location'],
    },
  },
  {
    name: 'run_weather_simulation',
    description:
      'Run a read-only Digital Twin what-if simulation: given a hypothetical rainfall/temperature/wind scenario for a city, project the effect on fulfillment. This NEVER touches real bookings, inventory, or payments — it only produces a projection.',
    parameters: {
      type: 'object',
      properties: {
        location: { type: 'string', description: 'City name, e.g. "Thane"' },
        rainfall: { type: 'number', description: 'Hypothetical rainfall in mm (0-500)' },
        stormDuration: { type: 'number', description: 'Hypothetical storm duration in hours (0-24)' },
        temperature: { type: 'number', description: 'Hypothetical temperature in Celsius' },
        windSpeed: { type: 'number', description: 'Hypothetical wind speed in km/h' },
      },
      required: ['location', 'rainfall', 'temperature', 'windSpeed'],
    },
  },
];

const TOOLS = TOOL_SPECS.map((function_) => ({ type: 'function', function: function_ }));

/* ------------------------------------------------------------------ */
/* Tool execution                                                      */
/* ------------------------------------------------------------------ */

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const when = (startAt: string, endAt: string) => {
  const fmt = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
  const time = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit' });
  const s = new Date(startAt);
  const e = new Date(endAt);
  const sameDay = s.toDateString() === e.toDateString();
  return `${fmt.format(s)} – ${sameDay ? time.format(e) : fmt.format(e)}`;
};

function bookingCard(b: BookingDetail, role: Mode, businessId: string): BookingCard {
  const last = b.offers[b.offers.length - 1];
  const me = businessId;
  return {
    bookingId: b.id,
    ref: b.ref,
    title: b.title,
    status: b.status,
    counterpart: role === 'seeker' ? b.provider.name : b.seeker.name,
    startAt: b.startAt,
    endAt: b.endAt,
    total: b.total,
    lastOffer: last && {
      round: last.round,
      price: last.price,
      from: last.fromBusinessId === me ? 'you' : 'them',
      message: last.message,
      status: last.status,
    },
  };
}

interface ToolOutcome {
  content: string;
  isError?: boolean;
  block?: UIBlock;
}

async function runTool(name: string, raw: unknown, session: Session, mode: Mode, businessId: string, clerkUserId?: string): Promise<ToolOutcome> {
  switch (name) {
    case 'search_resources': {
      const input = SearchInput.parse(raw);
      if (new Date(input.endAt) <= new Date(input.startAt)) return { content: 'endAt must be after startAt', isError: true };
      const matches: MatchCard[] = (await findMatches(input, businessId)).slice(0, 5).map((m) => ({
        resourceId: m.resource.id,
        title: m.resource.title,
        category: m.resource.category,
        provider: m.resource.business.name,
        area: m.resource.business.area,
        verified: m.resource.business.verified,
        rating: m.resource.business.rating,
        distanceKm: m.distanceKm,
        price: m.resource.price,
        unit: m.resource.unit,
        unitLabel: m.resource.unitLabel,
        available: m.resource.available,
        fulfils: m.fulfils,
        delivery: m.delivery,
        landed: m.landed,
        matchScore: m.total,
      }));
      const terms = await prisma.exchangeListing.findMany({
        where: { id: { in: matches.map((m) => m.resourceId) } },
        select: { id: true, minRentalHours: true, deposit: true, cancellation: true },
      });
      const forModel = matches.map((m) => {
        const t = terms.find((row) => row.id === m.resourceId);
        return { ...m, minRentalHours: t?.minRentalHours, deposit: t?.deposit, cancellation: t?.cancellation };
      });
      if (matches.length) session.lastSearch = { quantity: input.quantity, startAt: input.startAt, endAt: input.endAt, matches };
      return {
        content: matches.length ? JSON.stringify(forModel) : 'No available listings match. Suggest widening the area, time, or budget.',
        block: matches.length ? { type: 'options', quantity: input.quantity, startAt: input.startAt, endAt: input.endAt, matches } : undefined,
      };
    }

    case 'propose_booking': {
      if (mode !== 'seeker') return { content: 'Bookings can only be made in seeker mode. Ask the user to switch to Seeker.', isError: true };
      const input = ProposeBookingInput.parse(raw);
      if (new Date(input.endAt) <= new Date(input.startAt)) return { content: 'endAt must be after startAt', isError: true };
      const listing = await prisma.exchangeListing.findUnique({ where: { id: input.resourceId }, include: { business: true } });
      if (!listing) return { content: `No listing with id ${input.resourceId}`, isError: true };
      if (input.quantity > listing.available) {
        return { content: `Only ${listing.available} ${listing.unitLabel} available on ${listing.title}.`, isError: true };
      }
      const hours = (new Date(input.endAt).getTime() - new Date(input.startAt).getTime()) / 36e5;
      const price = input.offerPrice ?? listing.price;
      const total = Math.round(price * input.quantity * rentalUnits(listing.unit, input.startAt, input.endAt));
      const actionId = randomUUID();
      const card: ConfirmCard = {
        actionId,
        kind: 'book',
        title: `Request ${listing.title}`,
        lines: [
          `${listing.business.name} · ${listing.business.area}`,
          `${input.quantity} ${listing.unitLabel} · ${when(input.startAt, input.endAt)}`,
          input.offerPrice ? `Your offer ${inr(price)} (list ${inr(listing.price)}) per ${listing.unit.toLowerCase()}` : `${inr(price)} per ${listing.unit.toLowerCase()}`,
          ...(listing.deposit ? [`Refundable deposit ${inr(listing.deposit)}`] : []),
          ...(hours < listing.minRentalHours ? [`Note: minimum rental is ${listing.minRentalHours} h`] : []),
        ],
        total,
      };
      session.pending.set(actionId, {
        kind: 'book',
        card,
        input: { ...input, title: input.title ?? listing.title },
      });
      return {
        content: `Confirm card shown (estimated total ${inr(total)}). Wait for the user's decision.`,
        block: { type: 'confirm', action: card },
      };
    }

    case 'list_bookings': {
      const { role } = ListBookingsInput.parse(raw);
      const bookings = (await listBookings(role, businessId)).slice(0, 8).map((b) => bookingCard(b, role, businessId));
      return {
        content: bookings.length ? JSON.stringify(bookings) : 'No bookings yet.',
        block: bookings.length ? { type: 'bookings', role, bookings } : undefined,
      };
    }

    case 'propose_offer_response': {
      const input = ProposeResponseInput.parse(raw);
      if (input.action === 'counter' && input.price === undefined) return { content: 'A counter needs a price.', isError: true };
      const all = await listBookings(mode, businessId);
      const booking = all.find((b) => b.id === input.bookingId);
      if (!booking) return { content: `Booking ${input.bookingId} isn't one of this user's ${mode} bookings.`, isError: true };
      if (!ACTIVE.includes(booking.status)) return { content: `Booking ${booking.ref} is ${booking.status}; only pending or countered requests can be answered.`, isError: true };
      const line = booking.lines[0];
      const verb = input.action === 'accept' ? 'Accept' : input.action === 'reject' ? 'Decline' : 'Counter';
      const actionId = randomUUID();
      const card: ConfirmCard = {
        actionId,
        kind: 'respond',
        title: `${verb} ${booking.ref}`,
        lines: [
          `${booking.title} · ${mode === 'seeker' ? booking.provider.name : booking.seeker.name}`,
          `${line.quantity} × ${line.resource.title} · ${when(booking.startAt, booking.endAt)}`,
          input.action === 'counter' ? `Counter at ${inr(input.price!)} per unit (current ${inr(line.agreedPrice)})` : `At ${inr(line.agreedPrice)} per unit`,
          ...(input.message ? [`“${input.message}”`] : []),
        ],
      };
      session.pending.set(actionId, { kind: 'respond', card, bookingId: booking.id, input: { ...input, as: mode } });
      return { content: 'Confirm card shown. Wait for the user\'s decision.', block: { type: 'confirm', action: card } };
    }

    case 'get_current_weather': {
      const input = GetWeatherInput.parse(raw);
      const { lat, lng } = cityCoords(input.location);
      const weather = await getCurrentWeather(lat, lng, input.location);
      return { content: JSON.stringify(weather) };
    }

    case 'run_weather_simulation': {
      if (!clerkUserId) return { content: 'No signed-in user to run the simulation for.', isError: true };
      const input = RunWeatherSimulationInput.parse(raw);
      const { lat, lng } = cityCoords(input.location);
      const user = await findOrCreateHREUser(clerkUserId);
      // No specific Requirement is selected from chat, so this always uses
      // the Digital Twin's built-in demo scenario (falls back automatically
      // when requirementId doesn't match a real row) — still fully isolated
      // from real bookings/inventory either way.
      const sim = await runSimulation({
        userId: user.id,
        requirementId: 'demo-requirement',
        rainfall: input.rainfall,
        stormDuration: input.stormDuration ?? 0,
        temperature: input.temperature,
        windSpeed: input.windSpeed,
        location: input.location,
        latitude: lat,
        longitude: lng,
      });
      return { content: JSON.stringify(sim) };
    }

    default:
      return { content: `Unknown tool ${name}`, isError: true };
  }
}

/* ------------------------------------------------------------------ */
/* Agent loop                                                          */
/* ------------------------------------------------------------------ */

export class LLMUnavailableError extends Error {}

const StreamEvent = z.discriminatedUnion('type', [
  z.object({ type: z.literal('delta'), text: z.string() }),
  z.object({ type: z.literal('tool'), name: z.string() }),
  z.object({ type: z.literal('error'), error: z.string() }),
  z.object({
    type: z.literal('done'),
    content: z.string(),
    tool_calls: z.array(z.object({ name: z.string(), arguments: z.record(z.unknown()) })),
  }),
]);

export type ChatEvent = { event: 'delta'; text: string } | { event: 'status'; text: string } | { event: 'block'; block: UIBlock };
type Emit = (event: ChatEvent) => void;

const TOOL_STATUS: Record<string, string> = {
  search_resources: 'Searching nearby providers…',
  propose_booking: 'Preparing your request…',
  list_bookings: 'Checking your bookings…',
  propose_offer_response: 'Preparing your reply…',
  get_current_weather: 'Checking the weather…',
  run_weather_simulation: 'Running the weather simulation…',
};

/** Qwen writes tool calls as tags inside the reply. Pull them out so the user never sees the JSON. */
function toolCallsFromText(text: string): { content: string; toolCalls: LLMToolCall[] } {
  const toolCalls: LLMToolCall[] = [];
  const toolCallRe = /<tool_call>\s*([\s\S]*?)\s*<\/tool_call>/g;
  for (const match of text.matchAll(toolCallRe)) {
    try {
      const call = JSON.parse(match[1]) as { name?: string; arguments?: unknown };
      if (!call.name) continue;
      const args = typeof call.arguments === 'string' ? parseToolArguments(call.arguments) : call.arguments;
      toolCalls.push({
        name: call.name,
        arguments: args && typeof args === 'object' && !Array.isArray(args) ? (args as Record<string, unknown>) : {},
      });
    } catch {
      // A half-written tag is dropped with the rest of the markup.
    }
  }
  toolCallRe.lastIndex = 0;
  const content = text.replace(toolCallRe, '').split('<tool_call>')[0].trim();
  return { content, toolCalls };
}

function nugenAuth(): { key: string; model: string } | null {
  const key = process.env.NUGEN_API_KEY?.trim();
  const model = process.env.NUGEN_MODEL_ID?.trim();
  if (!key || !model) return null;
  return { key, model };
}

function parseToolArguments(raw: string): Record<string, unknown> {
  if (!raw.trim()) return {};
  try {
    const value = JSON.parse(raw) as unknown;
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** OpenAI-style history. Tool-call ids are assigned in order so each tool result lines up with its call. */
function toNugenMessages(messages: LLMMessage[]) {
  const out: object[] = [{ role: 'system', content: SYSTEM_PROMPT }];
  let pendingIds: string[] = [];
  for (const message of messages) {
    if (message.role === 'assistant' && message.tool_calls?.length) {
      pendingIds = message.tool_calls.map(() => `call_${randomUUID()}`);
      out.push({
        role: 'assistant',
        content: message.content || '',
        tool_calls: message.tool_calls.map((call, index) => ({
          id: pendingIds[index],
          type: 'function',
          function: { name: call.name, arguments: JSON.stringify(call.arguments) },
        })),
      });
    } else if (message.role === 'tool') {
      out.push({ role: 'tool', tool_call_id: pendingIds.shift() ?? `call_${randomUUID()}`, content: message.content });
    } else {
      out.push({ role: message.role, content: message.content });
    }
  }
  return out;
}

/** One Nugen pass. Text is forwarded as it streams. Tool calls are assembled from the stream and run by the caller. */
async function completeWithNugen(messages: LLMMessage[], emit: Emit, auth: { key: string; model: string }) {
  let res: globalThis.Response;
  try {
    res = await fetch(NUGEN_CHAT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.key}` },
      body: JSON.stringify({
        model: auth.model,
        messages: toNugenMessages(messages),
        tools: TOOLS,
        temperature: 0.3,
        max_tokens: 800,
        stream: true,
      }),
      signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
    });
  } catch (error) {
    throw new LLMUnavailableError(error instanceof Error && error.name === 'TimeoutError' ? 'Nugen took too long to reply' : 'Nugen could not be reached');
  }
  if (!res.ok || !res.body) throw new LLMUnavailableError(`Nugen failed (${res.status}): ${(await res.text()).slice(0, 200)}`);

  const decoder = new TextDecoder();
  let buffer = '';
  let content = '';
  const toolCalls = new Map<number, { name: string; arguments: string; announced: boolean }>();
  const take = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) return false;
    const payload = trimmed.slice(5).trim();
    if (payload === '[DONE]') return true;
    const chunk = JSON.parse(payload) as {
      choices?: { delta?: { content?: string | null; tool_calls?: { index: number; function?: { name?: string; arguments?: string } }[] }; finish_reason?: string | null }[];
    };
    const choice = chunk.choices?.[0];
    const text = choice?.delta?.content;
    if (text) content += text;
    for (const call of choice?.delta?.tool_calls ?? []) {
      const current = toolCalls.get(call.index) ?? { name: '', arguments: '', announced: false };
      if (call.function?.name) current.name = call.function.name;
      if (call.function?.arguments) current.arguments += call.function.arguments;
      if (current.name && !current.announced) {
        current.announced = true;
        emit({ event: 'status', text: TOOL_STATUS[current.name] ?? 'Working on it…' });
      }
      toolCalls.set(call.index, current);
    }
    return false;
  };
  const finish = () => {
    const native = [...toolCalls.values()]
      .filter((call) => call.name)
      .map((call) => ({ name: call.name, arguments: parseToolArguments(call.arguments) }));
    const written = toolCallsFromText(content);
    const calls = native.length ? native : written.toolCalls;
    if (!calls.length && written.content) emit({ event: 'delta', text: written.content });
    return { content: written.content, toolCalls: calls };
  };

  for await (const chunk of res.body) {
    buffer += decoder.decode(chunk as Uint8Array, { stream: true });
    let newline: number;
    while ((newline = buffer.indexOf('\n')) >= 0) {
      const done = take(buffer.slice(0, newline));
      buffer = buffer.slice(newline + 1);
      if (done) return finish();
    }
  }
  if (buffer.trim()) take(buffer);
  return finish();
}

/** One local-model pass. Visible text is forwarded as it's generated; a status line as soon as a tool call starts. */
async function completeLocally(messages: LLMMessage[], emit: Emit) {
  const aiUrl = process.env.AI_SERVICE_URL ?? 'http://localhost:8008';
  let res: globalThis.Response;
  try {
    res = await fetch(`${aiUrl}/llm/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages], tools: TOOLS }),
      signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
    });
  } catch (error) {
    throw new LLMUnavailableError(error instanceof Error && error.name === 'TimeoutError' ? 'The local model took too long to reply' : 'The local model is not running');
  }
  if (!res.ok || !res.body) throw new LLMUnavailableError(`The local model failed (${res.status}): ${(await res.text()).slice(0, 200)}`);

  const decoder = new TextDecoder();
  let buffer = '';
  for await (const chunk of res.body) {
    buffer += decoder.decode(chunk as Uint8Array, { stream: true });
    let newline: number;
    while ((newline = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (!line) continue;
      const event = StreamEvent.parse(JSON.parse(line));
      if (event.type === 'delta') emit({ event: 'delta', text: event.text });
      else if (event.type === 'tool') emit({ event: 'status', text: TOOL_STATUS[event.name] ?? 'Working on it…' });
      else if (event.type === 'error') throw new LLMUnavailableError(`The local model failed: ${event.error}`);
      else return { content: event.content, toolCalls: event.tool_calls };
    }
  }
  throw new LLMUnavailableError('The local model stopped mid-reply');
}

async function complete(messages: LLMMessage[], emit: Emit) {
  const nugen = nugenAuth();
  if (nugen) return completeWithNugen(messages, emit, nugen);
  return completeLocally(messages, emit);
}

function contextTag(mode: Mode) {
  const now = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'short' }).format(new Date());
  return `<context>now: ${now} (Asia/Kolkata, +05:30); mode: ${mode}</context>`;
}

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
const CATEGORY_WORDS: [string, (typeof CATEGORIES)[number]][] = [
  ['chair', 'CHAIRS_TABLES'],
  ['table', 'CHAIRS_TABLES'],
  ['banquet', 'BANQUET_SPACE'],
  ['hall', 'BANQUET_SPACE'],
  ['venue', 'BANQUET_SPACE'],
  ['van', 'VEHICLES'],
  ['vehicle', 'VEHICLES'],
  ['bus', 'VEHICLES'],
  ['kitchen', 'KITCHEN'],
  ['cater', 'KITCHEN'],
  ['projector', 'AV_EQUIPMENT'],
  ['speaker', 'AV_EQUIPMENT'],
  ['microphone', 'AV_EQUIPMENT'],
  ['parking', 'PARKING'],
  ['linen', 'LINEN_DECOR'],
  ['decor', 'LINEN_DECOR'],
];

function istToday() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' })
      .formatToParts(new Date())
      .map((part) => [part.type, part.value]),
  );
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday);
  return { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day), weekday };
}

function addDays(year: number, month: number, day: number, days: number) {
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

function clockMinutes(hourRaw: string, minuteRaw: string | undefined, mer: string | undefined, fallbackMer?: string) {
  let hour = Number(hourRaw);
  const minute = minuteRaw ? Number(minuteRaw) : 0;
  const marker = (mer ?? fallbackMer)?.toLowerCase().replace(/\./g, '');
  if (marker === 'pm' && hour < 12) hour += 12;
  if (marker === 'am' && hour === 12) hour = 0;
  if (!marker && hour < 12) hour += 12;
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
}

function resolveDay(text: string) {
  const today = istToday();
  if (/\btomorrow\b/.test(text)) return addDays(today.year, today.month, today.day, 1);
  if (/\b(today|tonight)\b/.test(text)) return { year: today.year, month: today.month, day: today.day };
  for (let index = 0; index < WEEKDAYS.length; index++) {
    if (text.includes(WEEKDAYS[index])) {
      const delta = (index - today.weekday + 7) % 7;
      return addDays(today.year, today.month, today.day, delta);
    }
  }
  return null;
}

/** The 0.5B model often answers in prose instead of a tool call. A complete request still runs the tool. */
function planTurn(text: string, mode: Mode, session: Session): LLMToolCall | null {
  const lower = text.toLowerCase();
  // The Book button sends this. Match it before category words, or "Golden Chairs" is treated as a new search.
  const direct = text.match(/^Book\s+.+\(id\s+([^)\s]+)\)\s+[—–-]\s+(\d+)\b(?:.*?from\s+(\S+)\s+to\s+(\S+))?/i);
  if (direct) {
    const startAt = direct[3] ?? session.lastSearch?.startAt;
    const endAt = direct[4]?.replace(/[.,]+$/, '') ?? session.lastSearch?.endAt;
    if (startAt && endAt) {
      return {
        name: 'propose_booking',
        arguments: { resourceId: direct[1], quantity: Number(direct[2]), startAt, endAt },
      };
    }
  }

  const category = CATEGORY_WORDS.find(([word]) => lower.includes(word))?.[1];
  const range = text.match(/(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?\s*(?:–|—|-|to)\s*(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?/i);
  if (category && range) {
    const start = clockMinutes(range[1], range[2], range[3], range[6]);
    const end = clockMinutes(range[4], range[5], range[6], range[3]);
    const day = resolveDay(lower);
    const quantity = text.replace(range[0], ' ').match(/\b(\d{1,4})\b/);
    if (start != null && end != null && end > start && day && quantity) {
      const area = AREAS.find((name) => lower.includes(name.toLowerCase()));
      const pad = (n: number) => String(n).padStart(2, '0');
      const at = (minutes: number) => `${day.year}-${pad(day.month)}-${pad(day.day)}T${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
      return {
        name: 'search_resources',
        arguments: { category, quantity: Number(quantity[1]), startAt: at(start), endAt: at(end), ...(area ? { area } : {}) },
      };
    }
  }

  const saved = session.lastSearch;
  if (saved && /\b(book|yes|take it|that one|the first|first one)\b/i.test(text) && !category) {
    const named = saved.matches.find((match) => lower.includes(match.title.toLowerCase()) || lower.includes(match.provider.toLowerCase()));
    const pick = named ?? saved.matches[0];
    return {
      name: 'propose_booking',
      arguments: { resourceId: pick.resourceId, quantity: saved.quantity, startAt: saved.startAt, endAt: saved.endAt },
    };
  }

  if (/\b(my bookings|my requests|show (?:my )?(?:bookings|requests)|incoming requests|pending requests)\b/i.test(text)) {
    return { name: 'list_bookings', arguments: { role: /\bincoming\b/i.test(text) ? 'provider' : mode } };
  }

  const city = Object.keys(WEATHER_CITIES).find((name) => lower.includes(name));
  if (/\b(what if|if it rains|storm|heavy rain)\b/.test(lower)) {
    return { name: 'run_weather_simulation', arguments: { location: city ?? 'mumbai', rainfall: 80, temperature: 28, windSpeed: 30 } };
  }
  if (/\bweather\b/.test(lower)) return { name: 'get_current_weather', arguments: { location: city ?? 'mumbai' } };
  return null;
}

function searchSentence(block: Extract<UIBlock, { type: 'options' }>) {
  const best = block.matches[0];
  const extra = block.matches.length - 1;
  const more = extra > 0 ? ` ${extra} more ${extra === 1 ? 'option is' : 'options are'} on the cards.` : '';
  return `${best.title} from ${best.provider} in ${best.area} is the closest fit for ${block.quantity}. About ${inr(best.landed)} landed.${more} Tap Book on a card, or tell me what to change.`;
}

function replyMissedTheRequest(text: string) {
  const lower = text.toLowerCase();
  return !lower.trim() || lower.includes('how many') || lower.includes('marol') || lower.includes('carter road');
}

// Tools whose confirm card says everything; a second model pass would only add "tap Confirm".
const CARD_ONLY_TOOLS = new Set(['propose_booking', 'propose_offer_response']);
const CARD_ONLY_REPLY = 'Check the details and tap Confirm to send it, or tell me what to change.';

export async function chat(session: Session, userText: string, mode: Mode, emit: Emit, businessId: string, clerkUserId?: string): Promise<void> {
  const checkpoint = session.messages.length;
  session.messages.push({ role: 'user', content: `${contextTag(mode)}\n${userText}` });

  try {
    let shownSearch: Extract<UIBlock, { type: 'options' }> | undefined;
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const planned = round === 0 ? planTurn(userText, mode, session) : null;
      if (planned) emit({ event: 'status', text: TOOL_STATUS[planned.name] ?? 'Working on it…' });
      const reply = planned ? { content: '', toolCalls: [planned] } : await complete(session.messages, emit);
      if (shownSearch && reply.toolCalls.length === 0 && replyMissedTheRequest(reply.content)) reply.content = searchSentence(shownSearch);
      session.messages.push({
        role: 'assistant',
        content: reply.content,
        tool_calls: reply.toolCalls.length ? reply.toolCalls : undefined,
      });
      if (reply.content) emit({ event: 'block', block: { type: 'text', text: reply.content } });
      if (reply.toolCalls.length === 0) return;

      let allCardsShown = true;
      for (const call of reply.toolCalls) {
        let outcome: ToolOutcome;
        try {
          outcome = await runTool(call.name, call.arguments, session, mode, businessId, clerkUserId);
        } catch (error) {
          outcome = {
            content: error instanceof z.ZodError ? `Invalid input: ${error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}` : 'Tool failed; tell the user something went wrong and try again.',
            isError: true,
          };
          if (!(error instanceof z.ZodError)) console.error(`Assistant tool ${call.name} failed:`, error);
        }
        if (outcome.block) {
          emit({ event: 'block', block: outcome.block });
          if (outcome.block.type === 'options') shownSearch = outcome.block;
        }
        if (outcome.isError || !CARD_ONLY_TOOLS.has(call.name)) allCardsShown = false;
        session.messages.push({ role: 'tool', content: outcome.isError ? `Error: ${outcome.content}` : outcome.content });
      }
      if (allCardsShown) {
        session.messages.push({ role: 'assistant', content: CARD_ONLY_REPLY });
        emit({ event: 'block', block: { type: 'text', text: CARD_ONLY_REPLY } });
        return;
      }
      // Cards are already on screen. Don't wait on another model pass before Book can be clicked.
      if (planned?.name === 'search_resources') {
        const sentence = shownSearch ? searchSentence(shownSearch) : 'Nothing is free for that window. Try another area or a different time.';
        session.messages.push({ role: 'assistant', content: sentence });
        emit({ event: 'block', block: { type: 'text', text: sentence } });
        return;
      }
    }
    emit({ event: 'block', block: { type: 'text', text: 'That took more steps than expected — could you tell me what to do next?' } });
  } catch (error) {
    session.messages.length = checkpoint;
    throw error;
  }
}

export async function resolveAction(session: Session, actionId: string, decision: 'confirm' | 'cancel', mode: Mode, businessId: string) {
  const action = session.pending.get(actionId);
  if (!action) return null;
  session.pending.delete(actionId);

  let result: Extract<UIBlock, { type: 'result' }>;
  let changed = false;
  if (decision === 'cancel') {
    result = { type: 'result', ok: false, text: `Cancelled: ${action.card.title}` };
  } else if (action.kind === 'book') {
    const outcome = await createBooking(action.input, businessId);
    if (outcome.ok) {
      changed = true;
      result = { type: 'result', ok: true, text: `Request ${outcome.booking.ref} sent to ${outcome.booking.provider.name} — waiting for their reply.`, bookingId: outcome.booking.id };
    } else {
      result = { type: 'result', ok: false, text: outcome.status === 409 ? outcome.message : outcome.error };
    }
  } else {
    const updated = await respondToBooking(action.bookingId, action.input, businessId);
    if (updated) {
      changed = true;
      result = { type: 'result', ok: true, text: `${updated.ref} is now ${updated.status.toLowerCase()}.`, bookingId: updated.id };
    } else {
      result = { type: 'result', ok: false, text: 'That booking no longer exists.' };
    }
  }

  // A fixed follow-up instead of a model pass; the history still records the outcome for later turns.
  const followUp =
    decision === 'cancel'
      ? 'No problem, nothing was sent. Want to look at other options?'
      : result.ok
        ? 'Anything else you need for this event?'
        : 'That didn\'t go through. Want me to look for an alternative?';
  session.messages.push(
    { role: 'user', content: `${contextTag(mode)}\n[action result] ${decision === 'confirm' ? 'I confirmed' : 'I cancelled'} "${action.card.title}". Outcome: ${result.text}` },
    { role: 'assistant', content: followUp }
  );
  return { changed, blocks: [result, { type: 'text', text: followUp }] as UIBlock[] };
}
