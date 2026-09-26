/** Same deterministic marketplace series the Abhishek analytics page was designed against. */

type Category =
  | 'BANQUET_SPACE'
  | 'CHAIRS_TABLES'
  | 'VEHICLES'
  | 'KITCHEN'
  | 'AV_EQUIPMENT'
  | 'PARKING'
  | 'LINEN_DECOR';

type Area = 'Andheri' | 'Bandra' | 'Powai' | 'Lower Parel' | 'Juhu' | 'Vashi';

const CATEGORY_TICKET: Record<Category, number> = {
  BANQUET_SPACE: 42000,
  CHAIRS_TABLES: 9000,
  VEHICLES: 11000,
  KITCHEN: 16000,
  AV_EQUIPMENT: 14000,
  PARKING: 3500,
  LINEN_DECOR: 8000,
};

const CATEGORY_WEIGHT: [Category, number][] = [
  ['CHAIRS_TABLES', 0.26],
  ['VEHICLES', 0.18],
  ['AV_EQUIPMENT', 0.15],
  ['KITCHEN', 0.13],
  ['BANQUET_SPACE', 0.12],
  ['LINEN_DECOR', 0.1],
  ['PARKING', 0.06],
];

const AREAS: Area[] = ['Andheri', 'Bandra', 'Powai', 'Lower Parel', 'Juhu', 'Vashi'];
const AREA_WEIGHT = [0.24, 0.2, 0.14, 0.18, 0.14, 0.1];

interface MarketEvent {
  day: Date;
  category: Category;
  area: Area;
  revenue: number;
  accepted: boolean;
  mine: boolean;
  spend: boolean;
  hours: number;
}

interface Totals {
  earned: number;
  spent: number;
  bookings: number;
  requests: number;
  acceptanceRate: number;
  utilisation: number;
}

function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rand: () => number, items: T[], weights: number[]): T {
  let x = rand();
  for (let i = 0; i < items.length; i++) {
    x -= weights[i];
    if (x <= 0) return items[i];
  }
  return items[items.length - 1];
}

function parseDay(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

function ymd(day: Date) {
  const month = String(day.getMonth() + 1).padStart(2, '0');
  const date = String(day.getDate()).padStart(2, '0');
  return `${day.getFullYear()}-${month}-${date}`;
}

function eachDay(start: Date, end: Date) {
  const days: Date[] = [];
  for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    days.push(new Date(cursor));
  }
  return days;
}

function addDays(day: Date, amount: number) {
  const next = new Date(day);
  next.setDate(next.getDate() + amount);
  return next;
}

function isoWeekday(day: Date) {
  return day.getDay() === 0 ? 7 : day.getDay();
}

function startOfWeek(day: Date) {
  return addDays(day, 1 - isoWeekday(day));
}

function eventsOn(day: Date): MarketEvent[] {
  const rand = seeded(Number(ymd(day).replaceAll('-', '')));
  const weekend = isoWeekday(day) >= 5;
  const count = 3 + Math.floor(rand() * 5) + (weekend ? 4 : 0);
  return Array.from({ length: count }, () => {
    const category = pick(rand, CATEGORY_WEIGHT.map((entry) => entry[0]), CATEGORY_WEIGHT.map((entry) => entry[1]));
    return {
      day,
      category,
      area: pick(rand, AREAS, AREA_WEIGHT),
      revenue: Math.round((CATEGORY_TICKET[category] * (0.5 + rand())) / 10) * 10,
      accepted: rand() < (weekend ? 0.72 : 0.84),
      mine: rand() < 0.22,
      spend: rand() < 0.12,
      hours: 3 + Math.floor(rand() * 8),
    };
  });
}

function totalsOf(events: MarketEvent[], days: number): Totals {
  const accepted = events.filter((event) => event.accepted);
  const hours = accepted.reduce((sum, event) => sum + event.hours, 0);
  return {
    earned: accepted.filter((event) => event.mine).reduce((sum, event) => sum + event.revenue, 0),
    spent: accepted.filter((event) => event.spend).reduce((sum, event) => sum + event.revenue, 0),
    bookings: accepted.length,
    requests: events.length,
    acceptanceRate: events.length ? accepted.length / events.length : 0,
    utilisation: Math.min(1, hours / (days * 10 * 18)),
  };
}

export function buildAnalyticsReport(from: string, to: string) {
  const start = parseDay(from);
  const end = parseDay(to);
  const days = eachDay(start, end);
  const length = Math.max(days.length, 1);
  const events = days.flatMap(eventsOn);
  const previous = totalsOf(eachDay(addDays(start, -length), addDays(start, -1)).flatMap(eventsOn), length);
  const bucket = length > 45 ? 'week' : 'day';
  const bucketKey = (day: Date) => ymd(bucket === 'week' ? startOfWeek(day) : day);

  const series = new Map<string, { earned: number; spent: number; bookings: number; accepted: number; total: number }>();
  for (const day of days) series.set(bucketKey(day), { earned: 0, spent: 0, bookings: 0, accepted: 0, total: 0 });
  for (const event of events) {
    const row = series.get(bucketKey(event.day));
    if (!row) continue;
    row.total += 1;
    if (!event.accepted) continue;
    row.accepted += 1;
    row.bookings += 1;
    if (event.mine) row.earned += event.revenue;
    if (event.spend) row.spent += event.revenue;
  }

  const byCategory = new Map<Category, { revenue: number; bookings: number; hours: number }>();
  for (const [category] of CATEGORY_WEIGHT) byCategory.set(category, { revenue: 0, bookings: 0, hours: 0 });
  for (const event of events) {
    if (!event.accepted) continue;
    const row = byCategory.get(event.category);
    if (!row) continue;
    row.bookings += 1;
    row.revenue += event.revenue;
    row.hours += event.hours;
  }
  const maxHours = Math.max(1, ...[...byCategory.values()].map((row) => row.hours));

  const heat = new Map<string, number>();
  for (const event of events) {
    const key = `${event.area}|${isoWeekday(event.day) - 1}`;
    heat.set(key, (heat.get(key) ?? 0) + 1);
  }

  return {
    from,
    to,
    bucket,
    totals: totalsOf(events, length),
    previous,
    series: [...series].map(([date, value]) => ({
      date,
      earned: value.earned,
      spent: value.spent,
      bookings: value.bookings,
    })),
    utilisationByCategory: [...byCategory].map(([category, value]) => ({
      category,
      utilisation: Math.min(0.95, (value.hours / maxHours) * 0.78),
    })),
    heatmap: AREAS.flatMap((area) =>
      Array.from({ length: 7 }, (_, weekday) => ({
        area,
        weekday,
        requests: heat.get(`${area}|${weekday}`) ?? 0,
      }))
    ),
    topCategories: [...byCategory]
      .map(([category, value]) => ({ category, revenue: value.revenue, bookings: value.bookings }))
      .sort((a, b) => b.revenue - a.revenue),
    acceptance: [...series].map(([date, value]) => ({
      date,
      accepted: value.accepted,
      total: value.total,
      rate: value.total ? value.accepted / value.total : 0,
    })),
  };
}

const LIVE_AREAS = ['Andheri', 'Bandra', 'Powai', 'Lower Parel', 'Juhu', 'Vashi'] as const;
const DEAL_STATUSES = new Set(['ACCEPTED', 'CONFIRMED', 'IN_USE', 'COMPLETED']);
const DEAD_STATUSES = new Set(['CANCELLED', 'REJECTED']);
const IN_FLIGHT = new Set(['PENDING', 'COUNTERED', 'ACCEPTED', 'CONFIRMED', 'IN_USE']);

export interface LiveDeal {
  createdAt: Date;
  startAt: Date;
  status: string;
  seekerId: string;
  seekerArea: string;
  total: number;
  offers: { fromBusinessId: string; status: string }[];
  items: { providerId: string; category: string; agreedPrice: number; quantity: number; area: string }[];
}

function involves(deal: LiveDeal, businessId: string) {
  return deal.seekerId === businessId || deal.items.some((item) => item.providerId === businessId);
}

function lineValue(deal: LiveDeal, businessId: string) {
  return deal.items
    .filter((item) => item.providerId === businessId)
    .reduce((sum, item) => sum + item.agreedPrice * item.quantity, 0);
}

function onDay(deal: LiveDeal, start: Date, end: Date) {
  const key = ymd(deal.createdAt);
  return key >= ymd(start) && key <= ymd(end);
}

function totalsFor(deals: LiveDeal[], businessId: string, listings: { quantity: number; available: number }[]) {
  const involved = deals.filter((deal) => involves(deal, businessId) && !DEAD_STATUSES.has(deal.status));
  const accepted = involved.filter((deal) => DEAL_STATUSES.has(deal.status));
  const utilisation = listings.length
    ? listings.reduce((sum, listing) => sum + (listing.quantity ? (listing.quantity - listing.available) / listing.quantity : 0), 0) / listings.length
    : 0;
  return {
    earned: accepted.reduce((sum, deal) => sum + lineValue(deal, businessId), 0),
    spent: involved.filter((deal) => deal.seekerId === businessId).reduce((sum, deal) => sum + deal.total, 0),
    bookings: accepted.length,
    requests: involved.length,
    acceptanceRate: involved.length ? accepted.length / involved.length : 0,
    utilisation,
  };
}

export function buildLiveReport(
  from: string,
  to: string,
  businessId: string,
  deals: LiveDeal[],
  listings: { category: string; quantity: number; available: number }[]
) {
  const start = parseDay(from);
  const end = parseDay(to);
  const days = eachDay(start, end);
  const length = Math.max(days.length, 1);
  const current = deals.filter((deal) => onDay(deal, start, end));
  const previous = deals.filter((deal) => onDay(deal, addDays(start, -length), addDays(start, -1)));
  const bucket = length > 45 ? 'week' : 'day';
  const bucketKey = (day: Date) => ymd(bucket === 'week' ? startOfWeek(day) : day);

  const series = new Map<string, { earned: number; spent: number; bookings: number; accepted: number; total: number }>();
  for (const day of days) series.set(bucketKey(day), { earned: 0, spent: 0, bookings: 0, accepted: 0, total: 0 });
  for (const deal of current) {
    if (!involves(deal, businessId) || DEAD_STATUSES.has(deal.status)) continue;
    const row = series.get(bucketKey(deal.createdAt));
    if (!row) continue;
    row.total += 1;
    if (deal.seekerId === businessId) row.spent += deal.total;
    if (!DEAL_STATUSES.has(deal.status)) continue;
    row.accepted += 1;
    row.bookings += 1;
    row.earned += lineValue(deal, businessId);
  }

  const byCategory = new Map<string, { revenue: number; bookings: number }>();
  for (const deal of current) {
    if (!involves(deal, businessId) || !DEAL_STATUSES.has(deal.status)) continue;
    for (const item of deal.items) {
      const row = byCategory.get(item.category) ?? { revenue: 0, bookings: 0 };
      row.revenue += item.agreedPrice * item.quantity;
      row.bookings += 1;
      byCategory.set(item.category, row);
    }
  }

  const utilisation = new Map<string, { used: number; quantity: number }>();
  for (const listing of listings) {
    const row = utilisation.get(listing.category) ?? { used: 0, quantity: 0 };
    row.used += Math.max(0, listing.quantity - listing.available);
    row.quantity += listing.quantity;
    utilisation.set(listing.category, row);
  }

  const heat = new Map<string, number>();
  for (const deal of current) {
    if (!involves(deal, businessId) || DEAD_STATUSES.has(deal.status)) continue;
    const area = deal.seekerId === businessId ? deal.items[0]?.area : deal.seekerArea;
    if (!area) continue;
    const key = `${area}|${isoWeekday(deal.startAt) - 1}`;
    heat.set(key, (heat.get(key) ?? 0) + 1);
  }

  return {
    from,
    to,
    bucket,
    totals: totalsFor(current, businessId, listings),
    previous: totalsFor(previous, businessId, listings),
    series: [...series].map(([date, value]) => ({
      date,
      earned: value.earned,
      spent: value.spent,
      bookings: value.bookings,
    })),
    utilisationByCategory: [...utilisation].map(([category, value]) => ({
      category,
      utilisation: value.quantity ? Math.min(1, value.used / value.quantity) : 0,
    })),
    heatmap: LIVE_AREAS.flatMap((area) =>
      Array.from({ length: 7 }, (_, weekday) => ({
        area,
        weekday,
        requests: heat.get(`${area}|${weekday}`) ?? 0,
      }))
    ),
    topCategories: [...byCategory]
      .map(([category, value]) => ({ category, revenue: value.revenue, bookings: value.bookings }))
      .sort((a, b) => b.revenue - a.revenue),
    acceptance: [...series].map(([date, value]) => ({
      date,
      accepted: value.accepted,
      total: value.total,
      rate: value.total ? value.accepted / value.total : 0,
    })),
  };
}

export function liveSummary(
  range: string,
  businessId: string,
  deals: LiveDeal[],
  listings: { category: string; quantity: number; available: number }[],
  avgResponseMins: number
) {
  const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  const start = addDays(end, -(days - 1));
  const inRange = deals.filter((deal) => onDay(deal, start, end));
  const totals = totalsFor(inRange, businessId, listings);
  const byCategory = new Map<string, { bookings: number; revenue: number }>();
  for (const deal of inRange) {
    if (!involves(deal, businessId) || DEAD_STATUSES.has(deal.status)) continue;
    for (const item of deal.items) {
      const row = byCategory.get(item.category) ?? { bookings: 0, revenue: 0 };
      row.bookings += 1;
      row.revenue += item.agreedPrice * item.quantity;
      byCategory.set(item.category, row);
    }
  }
  const mine = deals.filter((deal) => involves(deal, businessId));
  return {
    range,
    earned: totals.earned,
    spent: totals.spent,
    bookings: mine.filter((deal) => onDay(deal, start, end) && !DEAD_STATUSES.has(deal.status)).length,
    doubleBookings: 0,
    utilisation: totals.utilisation,
    pendingRequests: mine.filter((deal) => {
      if (!['PENDING', 'COUNTERED'].includes(deal.status)) return false;
      if (!deal.items.some((item) => item.providerId === businessId)) return false;
      const open = [...deal.offers].reverse().find((offer) => offer.status === 'OPEN');
      return !open || open.fromBusinessId !== businessId;
    }).length,
    avgResponseMins,
    activeRequests: mine.filter((deal) => deal.seekerId === businessId && IN_FLIGHT.has(deal.status)).length,
    byCategory: [...byCategory].map(([category, value]) => ({ category, ...value })),
    series: eachDay(start, end).map((day) => {
      const key = ymd(day);
      const onThisDay = inRange.filter((deal) => ymd(deal.createdAt) === key && involves(deal, businessId) && !DEAD_STATUSES.has(deal.status));
      return {
        date: key,
        earned: onThisDay.filter((deal) => DEAL_STATUSES.has(deal.status)).reduce((sum, deal) => sum + lineValue(deal, businessId), 0),
        spent: onThisDay.filter((deal) => deal.seekerId === businessId).reduce((sum, deal) => sum + deal.total, 0),
      };
    }),
  };
}
