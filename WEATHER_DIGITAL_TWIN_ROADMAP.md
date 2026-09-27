# Weather-Driven Digital Twin Implementation Roadmap

**Goal**: Integrate a read-only, weather-aware simulation layer into existing HRE without modifying real data.

**Status**: Ready to implement

---

## What Exists (DO NOT MODIFY)

- **Prisma Models**: User, Business, ProviderProfile, Resource, Inventory, Requirement, RequirementItem, Match, MatchItem, Negotiation, Booking, BookingItem, Fulfillment, Payment
- **Chat System**: FastAPI LLM + tool calling (exchange.ts services)
- **Frontend**: Discover.tsx with MatchMap (Leaflet), Requests page, Dashboard
- **Auth**: Clerk + per-business authorization
- **Matching Algorithm**: Distance, price, reliability, availability scoring

---

## What To Add (ADDITIVE ONLY)

### Phase 1: Weather API Service
- File: `server/src/services/digitalTwin/weatherService.ts`
- Abstraction: WeatherProvider interface
- Implementation: OpenWeather API (free tier)
- Output: Normalized weather structure with timestamp, location, temp, humidity, rainfall, wind, alerts
- Frontend endpoint: `/api/weather/current`

### Phase 2: Minimal Prisma Models
- `WeatherObservation` - Live weather data cache
- `SimulationScenario` - User's what-if parameters
- `SimulationResult` - Scenario + simulation outcomes
- `ImpactEvent` - Direct + cascading impact records
- `DigitalTwinState` - Current simulated state snapshot

**NO** marketplace models, pricing, credits, twins as products.

### Phase 3: Impact Engine
- File: `server/src/services/digitalTwin/impactEngine.ts`
- Direct impacts: weather → logistics risk
- Cascading impacts: logistics risk → provider fulfillment risk → units at risk
- Transparent rules (configurable, not black-box)
- Output: ImpactEvent records with propagation chain

### Phase 4: Digital Twin Simulation
- File: `server/src/services/digitalTwin/simulationService.ts`
- Input: Real HRE requirement + providers + simulated weather
- Process: Apply impact rules to calculate projected fulfillment
- Output: Projected fulfillment %, affected providers, at-risk units
- **CRITICAL**: Read-only (never modifies Booking, Inventory, Payment, Negotiation)

### Phase 5: What-If UI Page
- File: `client/src/pages/DigitalTwin.tsx`
- Layout: Live weather + Real HRE state + What-If sliders + Simulated result + Impact propagation map
- Sliders: Rainfall, storm duration, temperature, wind
- Results: Projected fulfillment, at-risk units, affected providers
- Map: Reuses MatchMap, shows risk overlay

### Phase 6: Direct + Cascading Impact Visualization
- Each impact shows: affected entity, risk level, cause, downstream effects
- Visual propagation: weather → road risk → provider delay → fulfillment risk
- No unexplained scores — each impact has transparent rule applied

### Phase 7: Geospatial Risk Map
- Extend MatchMap with weather risk overlay
- Show provider risk levels (HIGH/MEDIUM/LOW)
- Show logistics corridors with risk heatmap
- Clear distinction: LIVE DATA vs SIMULATED DATA

### Phase 8: Weather-Aware Matching Display
- Existing factors: price, distance, availability, capacity, reliability
- Add alongside: weatherRisk, logisticsRisk, delayRisk
- Do NOT replace existing scoring — extend it

### Phase 9: AI Weather Tools
- Add to existing LLM tools:
  - `get_current_weather`
  - `run_weather_simulation`
  - `get_digital_twin_state`
  - `find_weather_resilient_alternatives`
- Reuse existing tool-calling pattern in assistant.ts

### Phase 10: Social/Public Signals
- DemoSocialSignalProvider: Pre-defined demo signals
- Every demo signal labeled: "DEMO PUBLIC SIGNAL"
- Example: "Heavy rainfall reported near major road corridor (DEMO)"
- Endpoint: `/api/social-signals`

### Phase 11: Requirement/Booking Integration
- Add button on Requirement page: "[ Simulate Weather Impact ]"
- Add button on Booking page: "[ Run What-If Simulation ]"
- Opens /digital-twin with context pre-loaded

### Phase 12: Dashboard Widget
- Add to existing dashboard:
  - Weather intelligence card (current risk, upcoming weather)
  - At-risk fulfillment count
  - [Open Digital Twin] link
- Do NOT redesign dashboard — just add widget

### Phase 13: Demo Scenario
- **Hardcoded for reproducibility**:
  - Location: Thane
  - Event: Large hospitality event
  - Requirement: 300 units
  - Providers: A (150), B (100), C (50)
  - Baseline: Normal weather → 300/300 fulfillment
  - Simulate: 80mm rainfall → Provider A HIGH risk → 250/300 projected
- Identify alternative provider (Provider D) from existing HRE data

### Phase 14: Testing
- Test weather API normalization
- Test simulation isolation (no real data modified)
- Test direct + cascading impact propagation
- Test multi-provider scenario
- Verify: Inventory, Booking, Payment, Negotiation UNCHANGED after simulation

### Phase 15: Documentation
- docs/weather-digital-twin.md
- Architecture diagram
- Impact engine rules
- API reference
- Integration points

---

## Critical Rules

1. **Read-Only Simulation**: Never call `createBooking()`, `reserveInventory()`, `capturePayment()`, etc. during simulation
2. **Clear Labeling**: Every simulated value shows "SIMULATED" or "PROJECTED"
3. **Demo Signals**: Every demo signal shows "DEMO PUBLIC SIGNAL"
4. **Additive Schema**: Only add new models; do NOT modify existing ones
5. **API Abstraction**: Weather provider is pluggable (can swap OpenWeather for others)
6. **No Unexplained Scores**: Every impact has transparent rule
7. **Transparent Rules**: Coefficients configurable, not hardcoded magic numbers

---

## Implementation Order

1. **Week 1**:
   - Phase 1: Weather service
   - Phase 2: Add 5 Prisma models
   - Phase 3: Impact engine

2. **Week 2**:
   - Phase 4: Simulation service
   - Phase 5: What-If UI
   - Phase 6: Impact visualization

3. **Week 3**:
   - Phase 7-10: Map, matching, AI tools, social signals
   - Phase 11-12: Integration

4. **Week 4**:
   - Phase 13-15: Demo, testing, docs

---

## File Structure (New Files Only)

```
server/src/
  services/
    digitalTwin/
      weatherService.ts        # Weather API abstraction
      impactEngine.ts          # Direct + cascading rules
      simulationService.ts     # Simulation logic
      socialSignalService.ts   # Demo social signals
  routes/
    digitalTwin.ts             # API routes

client/src/
  pages/
    DigitalTwin.tsx            # Main what-if page
  components/
    digitalTwin/
      LiveWeatherCard.tsx       # Weather display
      SimulationControls.tsx    # Sliders for what-if
      SimulationResults.tsx     # Projected fulfillment
      ImpactPropagation.tsx     # Impact chain visualization
      RiskMap.tsx               # Geospatial risk overlay
  hooks/
    useWeather.ts              # Query live weather
    useDigitalTwin.ts          # Query/simulate

tests/
  services/
    weatherService.test.ts
    impactEngine.test.ts
    simulationService.test.ts

docs/
  weather-digital-twin.md      # Full documentation
```

---

## Success Criteria

- [ ] Live weather displays correctly
- [ ] Simulation runs without modifying real data
- [ ] Direct impacts calculated (e.g., rain → logistics risk)
- [ ] Cascading impacts propagate (e.g., logistics → fulfillment)
- [ ] What-if sliders change results in real-time
- [ ] Map shows simulated risk (not real risk)
- [ ] AI can answer weather queries
- [ ] Social signals labeled as DEMO
- [ ] Demo scenario reproducible
- [ ] All tests pass
- [ ] Real HRE data unchanged after simulation

---

**Ready to start Phase 1: Weather Service?**
