import { RESOURCE_CATEGORIES } from "./types";
import type {
  Booking,
  Business,
  ResourceCategory,
  SavedSearch,
  MatchScore,
  NegotiationOffer,
  Notification,
  Resource,
} from "./types";

export const CATEGORIES: readonly ResourceCategory[] = RESOURCE_CATEGORIES;

/* ------------------------------------------------------------------ */
/* Businesses                                                          */
/* ------------------------------------------------------------------ */

export const businesses: Business[] = [
  { id: "b01", name: "The Sahar Grand", type: "Hotel", area: "Andheri", address: "Sahar Rd, Andheri East", lat: 19.1004, lng: 72.8697, rating: 4.7, reviewCount: 212, responseRate: 0.96, avgResponseMins: 11, fulfillmentRate: 0.98, verified: true, joinedAt: "2025-03-14" },
  { id: "b02", name: "Carter Road Kitchen", type: "Restaurant", area: "Bandra", address: "Carter Rd, Bandra West", lat: 19.0662, lng: 72.8229, rating: 4.4, reviewCount: 87, responseRate: 0.88, avgResponseMins: 24, fulfillmentRate: 0.93, verified: true, joinedAt: "2025-06-02" },
  { id: "b03", name: "Lakeside Residency", type: "Hotel", area: "Powai", address: "Lake Blvd, Hiranandani Gardens", lat: 19.1197, lng: 72.9051, rating: 4.6, reviewCount: 164, responseRate: 0.93, avgResponseMins: 15, fulfillmentRate: 0.97, verified: true, joinedAt: "2025-01-20" },
  { id: "b04", name: "Mill Compound Banquets", type: "Banquet Hall", area: "Lower Parel", address: "Kamala Mills, Lower Parel", lat: 19.0033, lng: 72.8278, rating: 4.5, reviewCount: 139, responseRate: 0.91, avgResponseMins: 18, fulfillmentRate: 0.95, verified: true, joinedAt: "2024-11-08" },
  { id: "b05", name: "Juhu Tara Caterers", type: "Caterer", area: "Juhu", address: "Juhu Tara Rd, Juhu", lat: 19.1025, lng: 72.8266, rating: 4.3, reviewCount: 96, responseRate: 0.84, avgResponseMins: 32, fulfillmentRate: 0.9, verified: false, joinedAt: "2025-08-11" },
  { id: "b06", name: "Palm Beach Banquets", type: "Banquet Hall", area: "Vashi", address: "Palm Beach Rd, Sector 17, Vashi", lat: 19.0718, lng: 72.9982, rating: 4.2, reviewCount: 74, responseRate: 0.81, avgResponseMins: 41, fulfillmentRate: 0.89, verified: true, joinedAt: "2025-04-27" },
  { id: "b07", name: "Hiranandani Hospitality", type: "Hotel", area: "Powai", address: "Central Ave, Powai", lat: 19.1176, lng: 72.9106, rating: 4.8, reviewCount: 251, responseRate: 0.98, avgResponseMins: 8, fulfillmentRate: 0.99, verified: true, joinedAt: "2024-09-30" },
  { id: "b08", name: "Bandstand Events & Catering", type: "Caterer", area: "Bandra", address: "Bandstand Promenade, Bandra West", lat: 19.0469, lng: 72.8196, rating: 4.1, reviewCount: 58, responseRate: 0.79, avgResponseMins: 47, fulfillmentRate: 0.86, verified: false, joinedAt: "2025-09-05" },
  { id: "b09", name: "Marol Central Kitchen", type: "Caterer", area: "Andheri", address: "Marol Naka, Andheri East", lat: 19.1136, lng: 72.8816, rating: 4.5, reviewCount: 121, responseRate: 0.92, avgResponseMins: 16, fulfillmentRate: 0.96, verified: true, joinedAt: "2025-02-17" },
  { id: "b10", name: "Phoenix Social House", type: "Restaurant", area: "Lower Parel", address: "Senapati Bapat Marg, Lower Parel", lat: 18.9946, lng: 72.8258, rating: 4.6, reviewCount: 183, responseRate: 0.9, avgResponseMins: 20, fulfillmentRate: 0.94, verified: true, joinedAt: "2025-05-09" },
  { id: "b11", name: "Seaview Juhu Hotel", type: "Hotel", area: "Juhu", address: "Juhu Beach Rd, Juhu", lat: 19.0968, lng: 72.8262, rating: 4.4, reviewCount: 147, responseRate: 0.87, avgResponseMins: 26, fulfillmentRate: 0.92, verified: true, joinedAt: "2025-03-01" },
  { id: "b12", name: "Sector 17 Dining Co.", type: "Restaurant", area: "Vashi", address: "Sector 17, Vashi", lat: 19.0759, lng: 72.9989, rating: 4.0, reviewCount: 43, responseRate: 0.76, avgResponseMins: 55, fulfillmentRate: 0.85, verified: false, joinedAt: "2025-10-22" },
];

/* ------------------------------------------------------------------ */
/* Resources                                                           */
/* ------------------------------------------------------------------ */

/** Categories whose providers deliver to the venue; spaces, kitchens and parking are on-site. */
const DELIVERABLE = new Set<ResourceCategory>(["CHAIRS_TABLES", "VEHICLES", "AV_EQUIPMENT", "LINEN_DECOR"]);

const baseResources: Omit<Resource, "delivers" | "status">[] = [
  // Banquet Space
  { id: "r01", businessId: "b04", title: "Grand Mill Hall", category: "BANQUET_SPACE", description: "Double-height pillarless hall with in-house green rooms and separate pre-function foyer.", price: 18000, unit: "HOUR", quantity: 1, available: 1, unitLabel: "hall", minRentalHours: 4, capacity: 600, tags: ["pillarless", "AC", "stage"] },
  { id: "r02", businessId: "b01", title: "Sahar Ballroom (Half)", category: "BANQUET_SPACE", description: "Partitionable half of the main ballroom. Ideal for corporate dinners and product launches.", price: 12500, unit: "HOUR", quantity: 2, available: 1, unitLabel: "section", minRentalHours: 3, capacity: 220, tags: ["airport", "AC", "partitionable"] },
  { id: "r03", businessId: "b07", title: "Lakeview Terrace", category: "BANQUET_SPACE", description: "Open-air terrace overlooking Powai Lake with retractable canopy.", price: 9500, unit: "HOUR", quantity: 1, available: 1, unitLabel: "terrace", minRentalHours: 4, capacity: 180, tags: ["outdoor", "sunset", "canopy"] },
  { id: "r04", businessId: "b06", title: "Palm Court Lawn", category: "BANQUET_SPACE", description: "Landscaped lawn with generator backup and bridal suite access.", price: 65000, unit: "UNIT", quantity: 1, available: 0, unitLabel: "lawn", minRentalHours: 6, capacity: 800, tags: ["lawn", "wedding", "generator"] },
  { id: "r05", businessId: "b10", title: "Private Dining Mezzanine", category: "BANQUET_SPACE", description: "Semi-private mezzanine with dedicated bar counter.", price: 6000, unit: "HOUR", quantity: 1, available: 1, unitLabel: "floor", minRentalHours: 3, capacity: 70, tags: ["bar", "intimate"] },

  // Chairs & Tables
  { id: "r06", businessId: "b04", title: "Chiavari Chairs — Gold", category: "CHAIRS_TABLES", description: "Gold-finish chiavari chairs with ivory cushions.", price: 85, unit: "UNIT", quantity: 400, available: 260, unitLabel: "chairs", minRentalHours: 6, tags: ["wedding", "cushioned"] },
  { id: "r07", businessId: "b11", title: "Banquet Chairs with Covers", category: "CHAIRS_TABLES", description: "Stackable banquet chairs, white lycra covers and sashes included.", price: 45, unit: "UNIT", quantity: 300, available: 180, unitLabel: "chairs", minRentalHours: 4, tags: ["covers", "stackable"] },
  { id: "r08", businessId: "b03", title: "6ft Round Tables", category: "CHAIRS_TABLES", description: "Seats 10. Folding legs, delivered with skirting on request.", price: 350, unit: "UNIT", quantity: 60, available: 42, unitLabel: "tables", minRentalHours: 6, capacity: 10, tags: ["round", "10-seater"] },
  { id: "r09", businessId: "b06", title: "Cocktail Poseur Tables", category: "CHAIRS_TABLES", description: "High-top poseur tables with stretch covers.", price: 250, unit: "UNIT", quantity: 40, available: 40, unitLabel: "tables", minRentalHours: 4, tags: ["cocktail", "standing"] },
  { id: "r10", businessId: "b09", title: "Buffet Counters (8ft)", category: "CHAIRS_TABLES", description: "Stainless-top buffet counters with skirting and sneeze guards.", price: 600, unit: "UNIT", quantity: 24, available: 10, unitLabel: "counters", minRentalHours: 6, tags: ["buffet", "steel"] },

  // Vehicles
  { id: "r11", businessId: "b09", title: "Refrigerated Van (1.5T)", category: "VEHICLES", description: "Temperature-controlled van, 2–8°C, with driver. FSSAI compliant.", price: 1400, unit: "HOUR", quantity: 3, available: 2, unitLabel: "vans", minRentalHours: 4, tags: ["cold-chain", "driver"] },
  { id: "r12", businessId: "b01", title: "Guest Shuttle — 26 Seater", category: "VEHICLES", description: "AC coach with uniformed chauffeur for airport and venue transfers.", price: 2200, unit: "HOUR", quantity: 2, available: 1, unitLabel: "coaches", minRentalHours: 4, capacity: 26, tags: ["AC", "chauffeur"] },
  { id: "r13", businessId: "b05", title: "Tempo Traveller (12 Seater)", category: "VEHICLES", description: "Push-back seats, carrier on top, for staff or guest movement.", price: 1100, unit: "HOUR", quantity: 2, available: 2, unitLabel: "vans", minRentalHours: 5, capacity: 12, tags: ["staff", "luggage"] },
  { id: "r14", businessId: "b08", title: "Catering Delivery Van", category: "VEHICLES", description: "Insulated box van with racking for hot boxes and chafing dishes.", price: 900, unit: "HOUR", quantity: 2, available: 0, unitLabel: "vans", minRentalHours: 3, tags: ["insulated", "racks"] },

  // Kitchen Capacity
  { id: "r15", businessId: "b09", title: "Central Kitchen Line — Night Shift", category: "KITCHEN", description: "Full hot line with tilting braising pans and blast chiller, 10pm–6am.", price: 3500, unit: "HOUR", quantity: 1, available: 1, unitLabel: "line", minRentalHours: 6, capacity: 1500, tags: ["blast-chiller", "night"] },
  { id: "r16", businessId: "b02", title: "Pastry Section", category: "KITCHEN", description: "Marble bench, deck oven and planetary mixer, available before 11am.", price: 1200, unit: "HOUR", quantity: 1, available: 1, unitLabel: "section", minRentalHours: 3, tags: ["bakery", "deck-oven"] },
  { id: "r17", businessId: "b05", title: "Tandoor Station (x2)", category: "KITCHEN", description: "Two clay tandoors with prep space and a dedicated exhaust.", price: 950, unit: "HOUR", quantity: 2, available: 1, unitLabel: "tandoors", minRentalHours: 4, tags: ["tandoor", "exhaust"] },
  { id: "r18", businessId: "b12", title: "Cold Storage Walk-in", category: "KITCHEN", description: "12 cu.m. walk-in chiller with separate veg / non-veg racks.", price: 2500, unit: "DAY", quantity: 1, available: 1, unitLabel: "walk-in", minRentalHours: 24, tags: ["cold-storage"] },
  { id: "r19", businessId: "b07", title: "Banquet Plating Line", category: "KITCHEN", description: "Plate-up line for up to 400 covers with heated passes.", price: 140, unit: "UNIT", quantity: 400, available: 250, unitLabel: "covers", minRentalHours: 4, capacity: 400, tags: ["plating", "heated-pass"] },

  // AV Equipment
  { id: "r20", businessId: "b07", title: "LED Wall 16×9 ft (P3.9)", category: "AV_EQUIPMENT", description: "Modular LED wall with processor and on-site technician.", price: 28000, unit: "DAY", quantity: 1, available: 1, unitLabel: "wall", minRentalHours: 8, tags: ["LED", "technician"] },
  { id: "r21", businessId: "b01", title: "Line Array PA System", category: "AV_EQUIPMENT", description: "4+2 line array with 16-channel digital mixer and 4 wireless mics.", price: 16000, unit: "DAY", quantity: 1, available: 0, unitLabel: "system", minRentalHours: 8, tags: ["PA", "wireless-mics"] },
  { id: "r22", businessId: "b10", title: "Laser Projector + 10ft Screen", category: "AV_EQUIPMENT", description: "7000-lumen laser projector with fast-fold screen.", price: 6500, unit: "DAY", quantity: 2, available: 2, unitLabel: "sets", minRentalHours: 6, tags: ["projector", "screen"] },
  { id: "r23", businessId: "b03", title: "Wash & Spot Lighting Kit", category: "AV_EQUIPMENT", description: "12 moving heads, 16 LED pars, DMX console and truss.", price: 12000, unit: "DAY", quantity: 1, available: 1, unitLabel: "kit", minRentalHours: 8, tags: ["lighting", "truss"] },

  // Parking
  { id: "r24", businessId: "b03", title: "Basement Parking — 40 Bays", category: "PARKING", description: "Covered basement parking with valet desk access.", price: 120, unit: "HOUR", quantity: 40, available: 28, unitLabel: "bays", minRentalHours: 3, tags: ["covered", "valet"] },
  { id: "r25", businessId: "b06", title: "Open Lot — Coaches & Cars", category: "PARKING", description: "Open lot fitting 6 coaches or 60 cars, with security.", price: 80, unit: "HOUR", quantity: 60, available: 60, unitLabel: "bays", minRentalHours: 4, tags: ["coach-friendly", "security"] },
  { id: "r26", businessId: "b11", title: "Valet Team (6 drivers)", category: "PARKING", description: "Uniformed valet crew with key management system.", price: 4500, unit: "UNIT", quantity: 2, available: 1, unitLabel: "teams", minRentalHours: 4, tags: ["valet", "crew"] },

  // Linen & Decor
  { id: "r27", businessId: "b11", title: "Ivory Table Linen Set", category: "LINEN_DECOR", description: "Round tablecloth, runner and 10 napkins, laundered and pressed.", price: 220, unit: "UNIT", quantity: 120, available: 90, unitLabel: "sets", minRentalHours: 6, tags: ["ivory", "pressed"] },
  { id: "r28", businessId: "b04", title: "Floral Stage Backdrop", category: "LINEN_DECOR", description: "20ft stage backdrop with fresh marigold and rose styling.", price: 38000, unit: "UNIT", quantity: 1, available: 1, unitLabel: "backdrop", minRentalHours: 6, tags: ["floral", "stage"] },
  { id: "r29", businessId: "b08", title: "Brass Urli & Centrepieces", category: "LINEN_DECOR", description: "Brass urlis with floating candles and petals, 20-piece set.", price: 7500, unit: "UNIT", quantity: 3, available: 2, unitLabel: "sets", minRentalHours: 4, tags: ["brass", "traditional"] },
  { id: "r30", businessId: "b02", title: "Fairy Light Canopy", category: "LINEN_DECOR", description: "Warm-white fairy light canopy for 1,500 sq ft with rigging.", price: 9000, unit: "UNIT", quantity: 1, available: 0, unitLabel: "canopy", minRentalHours: 5, tags: ["lighting", "outdoor"] },
];

export const resources: Resource[] = baseResources.map((r) => {
  const delivers = DELIVERABLE.has(r.category);
  const n = Number(r.id.slice(1));
  return {
    ...r,
    status: "ACTIVE" as const,
    delivers,
    deliveryBase: delivers ? 150 : undefined,
    deliveryPerKm: delivers ? 45 + (n % 5) * 8 : undefined,
  };
});

/* ------------------------------------------------------------------ */
/* Bookings                                                            */
/* ------------------------------------------------------------------ */

export const bookings: Booking[] = [
  {
    id: "bk01", ref: "SPR-24A1", seekerId: "b02", title: "Rooftop product launch", status: "PENDING",
    items: [{ resourceId: "r22", providerId: "b10", quantity: 1, agreedPrice: 6500 }],
    startAt: "2026-10-18T17:00:00+05:30", endAt: "2026-10-18T23:00:00+05:30", total: 6500, createdAt: "2026-09-25T10:12:00+05:30",
  },
  {
    id: "bk02", ref: "SPR-24B7", seekerId: "b05", title: "Navratri dinner — 400 covers", status: "PENDING",
    items: [
      { resourceId: "r08", providerId: "b03", quantity: 40, agreedPrice: 350 },
      { resourceId: "r07", providerId: "b11", quantity: 180, agreedPrice: 45 },
      { resourceId: "r06", providerId: "b04", quantity: 220, agreedPrice: 85 },
    ],
    startAt: "2026-10-12T18:00:00+05:30", endAt: "2026-10-13T00:00:00+05:30", total: 40 * 350 + 180 * 45 + 220 * 85, createdAt: "2026-09-24T15:40:00+05:30",
  },
  {
    id: "bk03", ref: "SPR-24C3", seekerId: "b02", title: "Corporate offsite dinner", status: "COUNTERED",
    items: [
      { resourceId: "r02", providerId: "b01", quantity: 1, agreedPrice: 11800 },
      { resourceId: "r12", providerId: "b01", quantity: 1, agreedPrice: 2100 },
    ],
    startAt: "2026-10-04T19:00:00+05:30", endAt: "2026-10-04T23:00:00+05:30", total: 11800 * 4 + 2100 * 4, createdAt: "2026-09-22T09:05:00+05:30",
  },
  {
    id: "bk04", ref: "SPR-24D9", seekerId: "b10", title: "Diwali overflow cold chain", status: "ACCEPTED",
    items: [
      { resourceId: "r11", providerId: "b09", quantity: 2, agreedPrice: 1300 },
      { resourceId: "r18", providerId: "b12", quantity: 1, agreedPrice: 2400 },
    ],
    startAt: "2026-11-06T06:00:00+05:30", endAt: "2026-11-08T06:00:00+05:30", total: 2 * 1300 * 8 + 2400 * 2, createdAt: "2026-09-21T18:30:00+05:30",
  },
  {
    id: "bk05", ref: "SPR-23Z2", seekerId: "b11", title: "Wedding sangeet — Juhu", status: "CONFIRMED",
    items: [
      { resourceId: "r20", providerId: "b07", quantity: 1, agreedPrice: 26500 },
      { resourceId: "r23", providerId: "b03", quantity: 1, agreedPrice: 11500 },
      { resourceId: "r29", providerId: "b08", quantity: 2, agreedPrice: 7000 },
    ],
    startAt: "2026-10-02T18:00:00+05:30", endAt: "2026-10-03T01:00:00+05:30", total: 26500 + 11500 + 14000, createdAt: "2026-09-12T11:20:00+05:30",
  },
  {
    id: "bk06", ref: "SPR-23Y8", seekerId: "b06", title: "Weekend banquet plating support", status: "IN_USE",
    items: [{ resourceId: "r19", providerId: "b07", quantity: 250, agreedPrice: 135 }],
    startAt: "2026-09-26T12:00:00+05:30", endAt: "2026-09-26T16:00:00+05:30", total: 250 * 135, createdAt: "2026-09-18T14:02:00+05:30",
  },
  {
    id: "bk07", ref: "SPR-23W4", seekerId: "b01", title: "Airline crew banquet", status: "COMPLETED",
    items: [
      { resourceId: "r15", providerId: "b09", quantity: 1, agreedPrice: 3300 },
      { resourceId: "r10", providerId: "b09", quantity: 8, agreedPrice: 580 },
    ],
    startAt: "2026-09-14T22:00:00+05:30", endAt: "2026-09-15T04:00:00+05:30", total: 3300 * 6 + 8 * 580, createdAt: "2026-09-08T09:44:00+05:30",
  },
  {
    id: "bk08", ref: "SPR-23V1", seekerId: "b03", title: "Board meeting guest parking", status: "COMPLETED",
    items: [
      { resourceId: "r25", providerId: "b06", quantity: 20, agreedPrice: 75 },
      { resourceId: "r26", providerId: "b11", quantity: 1, agreedPrice: 4200 },
    ],
    startAt: "2026-09-10T09:00:00+05:30", endAt: "2026-09-10T14:00:00+05:30", total: 20 * 75 * 5 + 4200, createdAt: "2026-09-03T16:10:00+05:30",
  },
  {
    id: "bk09", ref: "SPR-23U6", seekerId: "b12", title: "Ganpati festival counters", status: "CANCELLED",
    items: [{ resourceId: "r17", providerId: "b05", quantity: 2, agreedPrice: 900 }],
    startAt: "2026-09-07T10:00:00+05:30", endAt: "2026-09-07T18:00:00+05:30", total: 2 * 900 * 8, createdAt: "2026-08-29T12:00:00+05:30",
  },
  {
    id: "bk10", ref: "SPR-23T3", seekerId: "b08", title: "Beach reception décor", status: "REJECTED",
    items: [
      { resourceId: "r27", providerId: "b11", quantity: 60, agreedPrice: 210 },
      { resourceId: "r28", providerId: "b04", quantity: 1, agreedPrice: 36000 },
    ],
    startAt: "2026-09-19T17:00:00+05:30", endAt: "2026-09-19T23:30:00+05:30", total: 60 * 210 + 36000, createdAt: "2026-09-11T19:25:00+05:30",
  },

  // Incoming requests for the demo provider (b09 · Marol Central Kitchen).
  {
    id: "bk11", ref: "SPR-25A2", seekerId: "b05", title: "Wedding lunch — cold chain", status: "PENDING", urgent: true,
    note: "Our own reefer broke down this morning — need it at 6am sharp.",
    items: [{ resourceId: "r11", providerId: "b09", quantity: 2, agreedPrice: 1250 }],
    startAt: "2026-09-27T06:00:00+05:30", endAt: "2026-09-27T14:00:00+05:30", total: 2 * 1250 * 8, createdAt: "2026-09-26T08:10:00+05:30",
  },
  {
    id: "bk12", ref: "SPR-25B7", seekerId: "b01", title: "Airline crew banquet (repeat)", status: "PENDING",
    items: [{ resourceId: "r15", providerId: "b09", quantity: 1, agreedPrice: 3200 }],
    startAt: "2026-10-02T22:00:00+05:30", endAt: "2026-10-03T04:00:00+05:30", total: 3200 * 6, createdAt: "2026-09-25T17:40:00+05:30",
  },
  {
    id: "bk13", ref: "SPR-25C1", seekerId: "b10", title: "Sunday brunch buffet", status: "COUNTERED",
    note: "Can you do ₹550 if we pick up ourselves?",
    items: [{ resourceId: "r10", providerId: "b09", quantity: 6, agreedPrice: 550 }],
    startAt: "2026-10-04T11:00:00+05:30", endAt: "2026-10-04T17:00:00+05:30", total: 6 * 550, createdAt: "2026-09-24T12:05:00+05:30",
  },
  {
    id: "bk14", ref: "SPR-25D4", seekerId: "b06", title: "Evening reception — dessert cold storage", status: "PENDING", urgent: true,
    items: [{ resourceId: "r11", providerId: "b09", quantity: 1, agreedPrice: 1400 }],
    startAt: "2026-09-26T16:00:00+05:30", endAt: "2026-09-26T22:00:00+05:30", total: 1400 * 6, createdAt: "2026-09-26T09:30:00+05:30",
  },
  {
    id: "bk15", ref: "SPR-25E9", seekerId: "b03", title: "Board offsite lunch", status: "PENDING",
    items: [{ resourceId: "r10", providerId: "b09", quantity: 8, agreedPrice: 520 }],
    startAt: "2026-10-10T11:00:00+05:30", endAt: "2026-10-10T17:00:00+05:30", total: 8 * 520, createdAt: "2026-09-23T15:15:00+05:30",
  },
];

/* ------------------------------------------------------------------ */
/* Negotiation offers                                                  */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Saved searches (seeker)                                             */
/* ------------------------------------------------------------------ */

export const savedSearches: SavedSearch[] = [
  { id: "ss1", name: "Chairs near Bandra", query: "category=CHAIRS_TABLES&qty=150&area=Bandra", createdAt: "2026-09-12T10:00:00+05:30", newMatches: 3 },
  { id: "ss2", name: "Reefer van, urgent", query: "category=VEHICLES&qty=1&area=Andheri&urgent=1", createdAt: "2026-09-18T09:30:00+05:30", newMatches: 1 },
  { id: "ss3", name: "Projectors under ₹7k", query: "category=AV_EQUIPMENT&qty=2&maxPrice=7000", createdAt: "2026-09-20T18:45:00+05:30", newMatches: 0 },
];

export const offers: NegotiationOffer[] = [
  // bk03 — Sahar Ballroom
  { id: "o01", bookingId: "bk03", resourceId: "r02", fromBusinessId: "b02", toBusinessId: "b01", round: 1, price: 10500, quantity: 1, message: "Weeknight slot, 4 hours. Can you do ₹10.5k/hr?", status: "COUNTERED", createdAt: "2026-09-22T09:10:00+05:30", expiresAt: "2026-09-23T09:10:00+05:30" },
  { id: "o02", bookingId: "bk03", resourceId: "r02", fromBusinessId: "b01", toBusinessId: "b02", round: 2, price: 12000, quantity: 1, message: "Best we can do is ₹12k with house AV included.", status: "COUNTERED", createdAt: "2026-09-22T13:42:00+05:30", expiresAt: "2026-09-23T13:42:00+05:30" },
  { id: "o03", bookingId: "bk03", resourceId: "r02", fromBusinessId: "b02", toBusinessId: "b01", round: 3, price: 11800, quantity: 1, message: "Meet at ₹11.8k and we'll book the shuttle too.", status: "OPEN", createdAt: "2026-09-25T11:05:00+05:30", expiresAt: "2026-09-27T11:05:00+05:30" },
  // bk03 — Shuttle
  { id: "o04", bookingId: "bk03", resourceId: "r12", fromBusinessId: "b02", toBusinessId: "b01", round: 1, price: 2100, quantity: 1, message: "Bundled with the ballroom.", status: "ACCEPTED", createdAt: "2026-09-25T11:06:00+05:30", expiresAt: "2026-09-27T11:06:00+05:30" },

  // bk04 — Refrigerated vans
  { id: "o05", bookingId: "bk04", resourceId: "r11", fromBusinessId: "b10", toBusinessId: "b09", round: 1, price: 1200, quantity: 2, message: "Two vans over Diwali weekend, 8 hrs/day.", status: "COUNTERED", createdAt: "2026-09-21T18:35:00+05:30", expiresAt: "2026-09-22T18:35:00+05:30" },
  { id: "o06", bookingId: "bk04", resourceId: "r11", fromBusinessId: "b09", toBusinessId: "b10", round: 2, price: 1300, quantity: 2, message: "Festival demand — ₹1,300 with driver overtime covered.", status: "OPEN", createdAt: "2026-09-24T10:20:00+05:30", expiresAt: "2026-09-26T22:00:00+05:30" },
  // bk04 — Cold storage
  { id: "o07", bookingId: "bk04", resourceId: "r18", fromBusinessId: "b10", toBusinessId: "b12", round: 1, price: 2200, quantity: 1, message: "Need the walk-in for 48 hours.", status: "OPEN", createdAt: "2026-09-21T18:40:00+05:30", expiresAt: "2026-09-26T18:40:00+05:30" },

  // bk02 — requested, initial asks
  { id: "o08", bookingId: "bk02", resourceId: "r06", fromBusinessId: "b05", toBusinessId: "b04", round: 1, price: 80, quantity: 220, message: "220 chiavari chairs, pick-up by our van.", status: "OPEN", createdAt: "2026-09-24T15:45:00+05:30", expiresAt: "2026-09-27T15:45:00+05:30" },

  // bk09 — expired before cancellation
  { id: "o09", bookingId: "bk09", resourceId: "r17", fromBusinessId: "b12", toBusinessId: "b05", round: 1, price: 800, quantity: 2, message: "Both tandoors for the full day?", status: "EXPIRED", createdAt: "2026-08-29T12:05:00+05:30", expiresAt: "2026-08-31T12:05:00+05:30" },
  // bk13 — seeker countered the list price for buffet counters
  { id: "o11", bookingId: "bk13", resourceId: "r10", fromBusinessId: "b10", toBusinessId: "b09", round: 1, price: 600, quantity: 6, message: "6 buffet counters for Sunday brunch.", status: "COUNTERED", createdAt: "2026-09-24T12:05:00+05:30", expiresAt: "2026-09-25T12:05:00+05:30" },
  { id: "o12", bookingId: "bk13", resourceId: "r10", fromBusinessId: "b10", toBusinessId: "b09", round: 2, price: 550, quantity: 6, message: "Can you do ₹550 if we pick up ourselves?", status: "OPEN", createdAt: "2026-09-24T12:20:00+05:30", expiresAt: "2026-09-27T12:20:00+05:30" },
  // bk01 — rejected earlier ask
  { id: "o10", bookingId: "bk01", resourceId: "r22", fromBusinessId: "b02", toBusinessId: "b10", round: 1, price: 5000, quantity: 1, message: "Could you do ₹5k for a 6 hour slot?", status: "REJECTED", createdAt: "2026-09-25T10:15:00+05:30", expiresAt: "2026-09-26T10:15:00+05:30" },
];

/* ------------------------------------------------------------------ */
/* Notifications                                                       */
/* ------------------------------------------------------------------ */

export const notifications: Notification[] = [
  { id: "n01", title: "Counter-offer received", body: "Marol Central Kitchen countered at ₹1,300/hr on Refrigerated Van.", createdAt: "2026-09-24T10:20:00+05:30", read: false },
  { id: "n02", title: "New request", body: "Juhu Tara Caterers requested 220 Chiavari Chairs for Oct 12.", createdAt: "2026-09-24T15:45:00+05:30", read: false },
  { id: "n03", title: "Booking in progress", body: "SPR-23Y8 plating support has started at Palm Beach Banquets.", createdAt: "2026-09-26T12:00:00+05:30", read: false },
  { id: "n04", title: "Dispute opened", body: "Bandstand Events raised an issue on SPR-23T3 linen count.", createdAt: "2026-09-20T09:30:00+05:30", read: true },
];

/* ------------------------------------------------------------------ */
/* Sample match scores (for demo / card previews)                      */
/* ------------------------------------------------------------------ */

export const sampleMatchScores: Record<string, MatchScore> = {
  r01: { price: 0.62, distance: 0.71, availability: 1, capacity: 0.95, reliability: 0.9 },
  r02: { price: 0.74, distance: 0.55, availability: 0.5, capacity: 0.8, reliability: 0.96 },
  r03: { price: 0.86, distance: 0.42, availability: 1, capacity: 0.7, reliability: 0.98 },
  r06: { price: 0.7, distance: 0.71, availability: 0.65, capacity: 0.9, reliability: 0.9 },
  r11: { price: 0.8, distance: 0.83, availability: 0.67, capacity: 0.6, reliability: 0.92 },
  r20: { price: 0.55, distance: 0.42, availability: 1, capacity: 1, reliability: 0.98 },
};

/* ------------------------------------------------------------------ */
/* Lookups                                                             */
/* ------------------------------------------------------------------ */

const businessById = new Map(businesses.map((b) => [b.id, b]));
const resourceById = new Map(resources.map((r) => [r.id, r]));

export function getBusiness(id: string): Business | undefined {
  return businessById.get(id);
}

export function getResource(id: string): Resource | undefined {
  return resourceById.get(id);
}

export function resourcesByCategory(category: ResourceCategory): Resource[] {
  return resources.filter((r) => r.category === category);
}

export function offersForBooking(bookingId: string): NegotiationOffer[] {
  return offers.filter((o) => o.bookingId === bookingId).sort((a, b) => a.round - b.round);
}

/** The signed-in business for each role in the demo. */
export const CURRENT_BUSINESS = { seeker: "b02", provider: "b09" } as const;
