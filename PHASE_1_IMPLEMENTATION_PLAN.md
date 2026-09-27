# Phase 1: HRE Architecture Audit & Digital Twin Integration Plan

**Status**: ✅ Complete (Audit finished)  
**Date**: 2026-09-27  
**Effort Estimate**: Phases 2-16 = 40-60 engineering hours

---

## Executive Summary

HRE has **strong foundational infrastructure** for Digital Twin integration:
- ✅ Prisma data layer with User, Business, Resource, Booking models
- ✅ Conversational AI system (FastAPI + Qwen 4B LLM with tool calling)
- ✅ Session-based chat with booking confirmation workflow
- ✅ Matching algorithm with weighted scoring
- ✅ Clerk authentication and authorization framework
- ✅ React frontend with dashboard, analytics, maps

**Decision**: Extend existing models and services rather than rebuild. Add Digital Twin as a new service tier alongside marketplace (exchange).

---

## Part 1: What Exists (Don't Touch)

### 1.1 Data Models (Prisma Schema)

**Core Marketplace Models** (in `server/prisma/schema.prisma`):
- `User` - Clerk-linked identity, onboarding tracking
- `Business` - Provider profile with verification (UNVERIFIED → PENDING → VERIFIED/REJECTED)
- `ProviderProfile` - Rating, response time, fulfillment metrics
- `ExchangeListing` - Resource offering (price, unit, availability, delivery options)
- `ExchangeBooking` - Order confirmation (seekerId, status machine)
- `ExchangeOffer` - Counter-offer negotiation
- `Inventory` - Real-time availability tracking

**These models are production-ready.** Do NOT refactor; extend alongside them.

### 1.2 Authentication & Authorization

**File**: `server/src/middleware/auth.ts`, `server/src/routes/auth.ts`

- Clerk OAuth integration (`@clerk/express`)
- Middleware attaches `req.user` (Clerk data + Prisma Business link)
- Protected routes via `authenticateRequest()` helper
- Onboarding flow: `/api/auth/onboarding` captures role + business info

**Key**: User → Business relationship is the authorization boundary. All data access is filtered by `req.user.businessId`.

### 1.3 Chat System & LLM

**Files**:
- `ai/app.py` - FastAPI service (Qwen3-VL-4B in 4-bit quantization)
- `server/src/services/assistant.ts` - LLM orchestration
- `server/src/routes/chat.ts` - NDJSON streaming endpoint

**Features**:
- Session-based conversation (2-hour TTL in-memory store)
- Tool calling: `search_resources`, `propose_booking`, `list_bookings`, `propose_offer_response`
- Confirm card pattern: LLM suggests action, user taps [Confirm]/[Cancel]
- Streaming text deltas + tool status updates (for UX responsiveness)
- Input coercion: Zod schemas tolerate loose model outputs (string→number, enum normalization)

**Architecture**: User types → `/api/chat` → FastAPI `/llm/chat/stream` → tool execution → confirm action → `/api/chat/confirm`

### 1.4 Booking & Fulfillment

**Files**:
- `server/src/services/exchange.ts` - Booking logic
- `server/src/routes/exchange.ts` - REST endpoints for fulfillment

**Key Functions**:
- `findMatches()` - Searches listings by category/quantity/date range, scores by price/distance/reliability/availability, returns top 5
- `createBooking()` - Atomic transaction: creates Booking + BookingItem + Inventory reservation
- `rentalUnits()` - Calculates billable duration (HOUR/DAY/UNIT pricing)
- `respondToBooking()` - Accept/reject/counter negotiation

**Status Machines**:
- Booking: PENDING → ACCEPTED/REJECTED/COMPLETED
- BookingItem: fulfillmentStatus (BOOKED → PREPARING → DISPATCHED → IN_TRANSIT → DELIVERED → CONFIRMED)
- BookingItem: paymentStatus (PENDING → SECURED → DELIVERING → RELEASED/FAILED)

### 1.5 Frontend Structure

**Pages**:
- Dashboard (`client/src/pages/Dashboard.tsx`) - Overview with stats
- Discover (`client/src/pages/Discover.tsx`) - Browse listings with map
- Requests (`client/src/pages/Requests.tsx`) - Manage requirements & negotiation
- Analytics (`client/src/pages/Analytics.tsx`) - Spend trends, top providers (Recharts)
- ResourceDetail (`client/src/pages/ResourceDetail.tsx`) - Single listing + booking CTA

**Components** (reusable):
- `chat/ChatWidget.tsx` - Streaming chat interface with confirm cards
- `discover/FilterPanel.tsx` - Category/price/area filters
- `discover/MapView.tsx` - Leaflet map showing provider locations
- `dashboard/Card.tsx`, `Badge.tsx` - Status indicators
- `ui/Button.tsx`, `Dialog.tsx`, `Form.tsx` - Headless primitives

**State Management**:
- Zustand stores: `auth`, `chat`, `bookings`
- TanStack Query v5: Server cache with auto-refetch
- React Hook Form: Form state + Zod validation

---

## Part 2: What Needs to Be Added for Digital Twin

### 2.1 New Prisma Models

**Add to `server/prisma/schema.prisma`** (do NOT modify existing models):

```prisma
// Digital Twin master record
model DigitalTwin {
  id            String   @id @default(cuid())
  businessId    String
  business      Business @relation(fields: [businessId], references: [id], onDelete: Cascade)
  
  name          String   // e.g., "AI Weather Forecaster v2.1"
  description   String?
  type          String   // e.g., "WEATHER_SIMULATOR", "DEMAND_PREDICTOR"
  status        String   @default("ACTIVE") // ACTIVE, ARCHIVED, DEPRECATED
  
  // Capabilities & limits
  maxSimultaneousRuns Int @default(5)
  costPerSimulation   Float @default(100.0) // Credits or currency
  inputSchema   Json   // JSON schema describing expected inputs
  outputSchema  Json   // JSON schema describing outputs
  
  // Metadata
  version       String   // "1.0.0", semver format
  createdBy     String   // Nugen/internal identifier
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  // Relations
  simulations   TwinSimulation[]
  capabilities  TwinCapability[]
  utilization   TwinUtilization[]
}

// Individual simulation run
model TwinSimulation {
  id            String   @id @default(cuid())
  twinId        String
  twin          DigitalTwin @relation(fields: [twinId], references: [id], onDelete: Cascade)
  
  userId        String
  user          User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // Execution tracking
  status        String   @default("QUEUED") // QUEUED, RUNNING, COMPLETED, FAILED, CANCELLED
  progress      Int      @default(0) // 0-100
  
  // Input & output
  inputParams   Json   // User-provided simulation parameters
  outputResult  Json?  // Simulation result (null until completed)
  errorMessage  String?
  
  // Resource usage
  computeTimeMs Int?   // How long it took to run
  costUsed      Float  @default(0.0) // Credits/currency consumed
  
  // Metadata
  name          String?  // User-friendly name
  note          String?  // User notes
  createdAt     DateTime @default(now())
  completedAt   DateTime?
}

// Twin capabilities/features list
model TwinCapability {
  id            String   @id @default(cuid())
  twinId        String
  twin          DigitalTwin @relation(fields: [twinId], references: [id], onDelete: Cascade)
  
  name          String   // e.g., "weather_impact_analysis", "demand_forecast"
  description   String?
  enabled       Boolean  @default(true)
}

// Time-series utilization metrics
model TwinUtilization {
  id            String   @id @default(cuid())
  twinId        String
  twin          DigitalTwin @relation(fields: [twinId], references: [id], onDelete: Cascade)
  
  timestamp     DateTime @default(now())
  utilizationPercent Float // 0-100
  activeSimulations Int
  queuedSimulations Int
  lastErrorCount Int @default(0)
}

// Link User to Digital Twin (permissions model)
model TwinAccess {
  id            String   @id @default(cuid())
  userId        String
  user          User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  twinId        String
  twin          DigitalTwin @relation(fields: [twinId], references: [id], onDelete: Cascade)
  
  role          String   @default("VIEWER") // VIEWER, EXECUTOR, ADMIN
  grantedAt     DateTime @default(now())
}
```

**Migration Steps**:
```bash
# Add models above to schema.prisma
npx prisma migrate dev --name add_digital_twin_models
```

### 2.2 New Services

**Create `server/src/services/twin.ts`**:
```typescript
// Twin CRUD, lifecycle management
export async function getTwin(id: string)
export async function listTwins(filters: { type?: string; businessId?: string })
export async function createTwin(data: CreateTwinInput)
export async function updateTwinStatus(id: string, status: 'ACTIVE' | 'ARCHIVED')
export async function deleteTwin(id: string)
```

**Create `server/src/services/simulation.ts`**:
```typescript
// Simulation lifecycle
export async function queueSimulation(req: SimulationInput)
export async function pollSimulationStatus(id: string)
export async function cancelSimulation(id: string)
export async function getSimulationResult(id: string)
export async function listSimulations(filter: { userId?: string; twinId?: string })
```

**Create `server/src/services/nugen-adapter.ts`**:
```typescript
// Bridge to external Nugen API or local simulation engine
export async function submitToNugen(twin: DigitalTwin, params: Json)
export async function pollNugenResult(jobId: string)
```

### 2.3 New API Routes

**Create `server/src/routes/twins.ts`**:
```
GET    /api/twins                     - List available twins (marketplace-like)
POST   /api/twins                     - Create new twin (admin only)
GET    /api/twins/:id                 - Twin detail + capabilities
PUT    /api/twins/:id                 - Update twin status/metadata
DELETE /api/twins/:id                 - Archive twin
```

**Create `server/src/routes/simulations.ts`**:
```
POST   /api/simulations               - Queue new simulation run
GET    /api/simulations               - List my simulations (by userId)
GET    /api/simulations/:id           - Poll status + get result
DELETE /api/simulations/:id           - Cancel running simulation
```

**Extend `server/src/routes/chat.ts`**:
- Add `search_twins` tool to LLM (mirrors `search_resources`)
- Add `propose_simulation_run` tool (shows confirm card for simulation params)
- Add `list_simulations` tool (lists user's past runs)

### 2.4 Frontend Pages & Components

**Create `client/src/pages/ExploreTwins.tsx`**:
- Mirrors `Discover.tsx` structure
- Cards show twin name, type, capabilities, cost per run
- Clickable to detail page
- Map optional (show provider location of twin owner)

**Create `client/src/pages/TwinDetail.tsx`**:
- Mirrors `ResourceDetail.tsx`
- Show full twin spec, capabilities, reviews/ratings
- [Run Simulation] button opens form with dynamic schema from `inputSchema`
- Results display with downloadable data

**Create `client/src/pages/MySimulations.tsx`**:
- Mirrors `Requests.tsx`
- List all user's simulation runs (status: QUEUED, RUNNING, COMPLETED, FAILED)
- Progress bar for running jobs
- Results downloadable as JSON/CSV
- Timeline of simulation costs (chart integration with Recharts)

**Extend `client/src/pages/Analytics.tsx`**:
- Add "Twin Utilization" section (line chart: utilization % over time)
- Add "Simulation Costs" pie chart
- Add "Top Used Twins" ranking

**Create `client/src/components/twin/SimulationForm.tsx`**:
- Dynamic form generation from `inputSchema` (JSON schema → React Hook Form)
- Parameter validation against schema
- Cost calculator (inputParams → estimated cost)

**Create `client/src/components/twin/SimulationResultsViewer.tsx`**:
- Display outputResult JSON as formatted table/tree
- Export as CSV/JSON
- Link to impact visualization (map, charts)

---

## Part 3: Integration Points

### 3.1 Chat System Extension

**File**: `server/src/services/assistant.ts`

Current tools:
1. `search_resources` - Marketplace search
2. `propose_booking` - Show booking confirm card
3. `list_bookings` - List marketplace bookings
4. `propose_offer_response` - Counter offers

**Add for Digital Twin**:
5. `search_twins` - Find twins by type, capability, cost
6. `propose_simulation_run` - Show simulation confirm card (parameters filled from LLM reasoning)
7. `list_simulations` - Show user's simulation history + results

**System Prompt Extension**:
```
You are an AI assistant for HRE (Hosting Resource Exchange).

You can help users with two types of requests:

1. **Marketplace**: Find, negotiate, and book physical resources (venues, equipment, logistics)
   Tools: search_resources, propose_booking, list_bookings, propose_offer_response

2. **Digital Twins**: Run simulations on specialized AI models to forecast demand, analyze weather impact, optimize costs
   Tools: search_twins, propose_simulation_run, list_simulations

When user asks about forecasting, simulations, or "what if" scenarios → route to Digital Twin tools
When user asks about renting, booking, finding vendors → route to Marketplace tools

Always confirm significant actions (bookings, simulations) before executing via confirm cards.
```

### 3.2 Homepage

**File**: `server/src/routes/home.ts`

Add featured twins section alongside featured listings:
```typescript
export async function getHomeData(userId: string) {
  return {
    featuredListings: [...],        // Existing marketplace
    featuredTwins: await getTwins({ // New Digital Twin section
      status: 'ACTIVE',
      limit: 5,
      sortBy: 'popularityScore',
    }),
    recentSimulations: await listSimulations({ // New simulation stats
      userId,
      limit: 10,
      completed: true,
    }),
    stats: {
      totalListings: ...,
      totalTwins: await countTwins(),
      simulationsThisMonth: await countSimulations({ since: monthAgo }),
    },
  };
}
```

### 3.3 Dashboard Widgets

**File**: `client/src/pages/Dashboard.tsx`

Add widgets:
- "My Simulations" card (pending runs, recent results)
- "Twin Alerts" card (recommended twins for current season/demand)
- "Digital Twin ROI" metric (cost savings from simulations)

### 3.4 Analytics Dashboard

**File**: `client/src/pages/Analytics.tsx`

Add sections:
- **Simulation Trends**: Line chart (simulations run per week)
- **Twin Utilization**: Bar chart (utilization % by twin)
- **Cost Analysis**: Pie chart (simulation spend by twin type)
- **Impact Heatmap**: Map-based view of digital twin impacts (weather, demand)

---

## Part 4: Reusable Code Patterns

### 4.1 Booking ↔ Simulation Pattern

**Marketplace Booking**:
```typescript
// File: server/src/services/exchange.ts
export async function createBooking(input: CreateBookingInput) {
  // 1. Validate resource exists & available
  // 2. Calculate total cost
  // 3. Create atomic transaction (Booking + BookingItem + Inventory update)
  // 4. Emit confirmation
}
```

**Digital Twin Simulation** (same pattern):
```typescript
// File: server/src/services/simulation.ts
export async function queueSimulation(input: SimulationInput) {
  // 1. Validate twin exists & operational
  // 2. Calculate simulation cost
  // 3. Create atomic transaction (TwinSimulation record + TwinUtilization)
  // 4. Emit confirmation (or queue for async processing)
}
```

### 4.2 Matching ↔ Twin Search Pattern

**Marketplace Matching**:
```typescript
// File: server/src/services/exchange.ts
export async function findMatches(req: MatchRequirement) {
  // Score by: price, distance, reliability, availability, capacity
  // Return top 5 sorted by weightedTotal()
}
```

**Digital Twin Search** (reuse scoring logic):
```typescript
// File: server/src/services/twin.ts
export async function findTwins(query: TwinSearchQuery) {
  // Score by: cost per run, accuracy (ratings), capability match, utilization
  // Reuse weighted scoring: adjustParams({ price → cost, reliability → accuracy })
}
```

### 4.3 Session ↔ Tool Calling Pattern

**Existing Chat Flow**:
```
User message → LLM → Tool call detected → Execute tool → Confirm card sent → User taps Confirm → Action committed
```

**Reuse for Twin Queries**:
```
"Forecast demand for next 30 days" → search_twins → propose_simulation_run (with auto-filled params) → Confirm card → Queue simulation
```

### 4.4 Frontend Cards

**Reusable template** (`client/src/components/ui/Card.tsx`):
```typescript
// Used for:
// - ResourceCard (marketplace listings)
// - MatchCard (search results)
// - BookingCard (order summary)
// - TwinCard (twin availability)
// - SimulationResultCard (run output)

export function Card({ title, subtitle, image, badges, stats, action }) {
  return (
    <div className="rounded border p-4">
      {image && <img src={image} />}
      <h3>{title}</h3>
      <p>{subtitle}</p>
      {badges?.map(b => <Badge>{b}</Badge>)}
      {stats?.map(s => <Stat>{s}</Stat>)}
      {action && <button onClick={action.onClick}>{action.label}</button>}
    </div>
  );
}
```

---

## Part 5: Risk & Mitigation

### 5.1 Single Point of Failure: Local LLM

**Current Risk**: LLM runs on local GPU (Qwen 4B). If GPU dies, chat system halts.

**Mitigation for Phases 2-3**:
1. Add API fallback (e.g., OpenAI/Anthropic API as secondary)
2. Queue failed requests to Redis for retry
3. Add circuit breaker pattern to FastAPI client

### 5.2 Inventory Concurrency

**Current Risk**: Two simultaneous bookings could double-count availability.

**Mitigation for Phase 5**:
1. Add Prisma transaction isolation (SET TRANSACTION ISOLATION LEVEL)
2. Implement pessimistic locking: `SELECT ... FOR UPDATE` in createBooking
3. Test with concurrent booking flood test

### 5.3 Nugen Integration Risk

**Current Risk**: External Nugen API may not exist or may have breaking changes.

**Mitigation for Phase 8**:
1. Implement `NugenAdapter` interface (pluggable)
2. Create mock Nugen service for development/testing
3. Plan API fallback to local simulation if Nugen unavailable
4. Document Nugen API contract and version pins

---

## Part 6: Roadmap (Phases 2-16)

| Phase | Title | Scope | Dependencies |
|-------|-------|-------|--------------|
| 1 | **Architecture Audit** ✅ | Understand existing HRE | — |
| 2 | **Digital Twin Database Layer** | Add Prisma models (DigitalTwin, TwinSimulation, TwinCapability, TwinUtilization) | Phase 1 |
| 3 | **Weather API Integration** | Fetch real weather data, store in simulation inputs | Phase 2 |
| 4 | **Digital Twin Impact Engine** | Logic to compute impacts (demand forecast, cost optimization) | Phase 2, 3 |
| 5 | **Twin Simulation Queue & Executor** | Queue management, progress tracking, result storage | Phase 2, 4 |
| 6 | **Nugen AI Integration** | Wrapper service to call external Nugen API or local engine | Phase 5 |
| 7 | **Frontend Twin Pages** | ExploreTwins, TwinDetail, MySimulations, SimulationForm, SimulationResultsViewer | Phase 2, 5 |
| 8 | **Chat System Extension** | Add search_twins, propose_simulation_run, list_simulations tools | Phase 6, 7 |
| 9 | **Dashboard Twin Widgets** | My Simulations, Twin Alerts, Digital Twin ROI cards | Phase 7 |
| 10 | **Analytics Twin Metrics** | Simulation trends, twin utilization heatmap, cost analysis | Phase 5, 9 |
| 11 | **Geospatial Impact Visualization** | Map-based view of weather/demand impacts by region | Phase 4, 10 |
| 12 | **Social/Public Signals Integration** | Display demo signals (labeled), integrate with forecast model | Phase 4 |
| 13 | **Simulation Cost Model & Credits** | Implement credit/billing system for simulation runs | Phase 5, 6 |
| 14 | **Testing & Evaluation** | Unit tests (services), integration tests (API), E2E tests (chat flow) | Phase 7-13 |
| 15 | **Documentation & Deployment** | API docs, deployment runbook, user guide for twins | Phase 14 |
| 16 | **Production Launch & Monitoring** | Alerts, logging, performance monitoring, incident response | Phase 15 |

---

## Part 7: Immediate Next Steps (Phase 2 Kickoff)

1. **Add Prisma models** → `server/prisma/schema.prisma`
2. **Run migration** → `npx prisma migrate dev --name add_digital_twin_models`
3. **Implement twin services** → `server/src/services/twin.ts`, `simulation.ts`
4. **Wire chat tools** → Extend `assistant.ts` with 3 twin tools
5. **API routes** → `server/src/routes/twins.ts`, `simulations.ts`
6. **Frontend pages** → `ExploreTwins.tsx`, `TwinDetail.tsx`, `MySimulations.tsx`

**Estimated Effort**: 12-16 hours (2 days sprint)

---

## Appendix: File Reference Map

**Core Existing Code** (don't refactor):
- `server/prisma/schema.prisma` - Data models
- `server/src/middleware/auth.ts` - Auth middleware
- `server/src/services/exchange.ts` - Marketplace logic
- `server/src/services/assistant.ts` - LLM orchestration
- `server/src/routes/chat.ts` - Chat endpoint
- `client/src/pages/Discover.tsx` - Browse pattern
- `client/src/pages/Requests.tsx` - Workflow pattern
- `client/src/components/chat/ChatWidget.tsx` - Chat UI

**New for Digital Twin**:
- `server/src/services/twin.ts` - 🆕 Twin CRUD
- `server/src/services/simulation.ts` - 🆕 Simulation lifecycle
- `server/src/services/nugen-adapter.ts` - 🆕 External API bridge
- `server/src/routes/twins.ts` - 🆕 Twin API
- `server/src/routes/simulations.ts` - 🆕 Simulation API
- `client/src/pages/ExploreTwins.tsx` - 🆕 Twin discovery
- `client/src/pages/TwinDetail.tsx` - 🆕 Twin detail
- `client/src/pages/MySimulations.tsx` - 🆕 My runs
- `client/src/components/twin/SimulationForm.tsx` - 🆕 Dynamic form
- `client/src/components/twin/SimulationResultsViewer.tsx` - 🆕 Results display

---

**Phase 1: COMPLETE** ✅  
Ready to proceed to **Phase 2: Digital Twin Database Layer**?
