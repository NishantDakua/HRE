# Weather-Driven Digital Twin — Quick Start & Testing Guide

**Status**: Backend ✅ | Frontend Page ✅ | Ready to Test

---

## ⚡ 60-Second Setup

### 1. Ensure Environment Variables
Edit `server/.env`:
```
WEATHER_PROVIDER=mock
# OR for live weather:
# WEATHER_PROVIDER=openweather
# WEATHER_API_KEY=your-key-from-https://openweathermap.org
```

### 2. Database is Ready
```bash
cd server
npx prisma db push --skip-generate  # Already done - tables exist
```

### 3. Start Backend & Frontend
```bash
# Terminal 1: Server
cd server
npm run dev

# Terminal 2: Client
cd client
npm run dev

# Terminal 3: AI Service (if needed)
cd ai
python app.py
```

### 4. Navigate to Digital Twin
- Open: http://localhost:3100/digital-twin
- You should see the live weather card + simulation controls

---

## 🎬 DEMO SCENARIO: 5 Minutes

**Goal**: Simulate weather impact on a 300-unit hospitality event

### Step 1: Load the Page
Go to: http://localhost:3100/digital-twin

You should see:
- **Left panel**: Live weather for Thane (28°C, clear skies)
- **Right panel**: Empty results area waiting for simulation

### Step 2: Configure What-If Scenario
Move these sliders:
1. **Rainfall**: Drag to `80 mm` (heavy rain)
2. **Storm Duration**: Leave at `0 h` (or any value)
3. **Temperature**: Leave at `28°C`
4. **Wind Speed**: Leave at `12 km/h`

### Step 3: Run Simulation
Click blue **[Run Simulation]** button

**Expected Result** (right side updates):
```
PROJECTED FULFILLMENT

83%  (vs 100% baseline)

50 units at risk

Affected Providers:
┌─────────────────────────┐
│ Provider A              │
│ Risk: HIGH (80%)        │
│ Projected: 50 / 150     │
└─────────────────────────┘

Affected Providers:
┌─────────────────────────┐
│ Provider B              │
│ Risk: LOW (10%)         │
│ Projected: 100 / 100    │
└─────────────────────────┘
```

### Step 4: Review Weather Impacts
Scroll down in results to see:
```
WEATHER IMPACTS

HEAVY_RAINFALL
Heavy rainfall: 80.0mm. Impacts road transport and logistics.

MODERATE_HUMIDITY
High humidity: 65%. May reduce workforce efficiency.
```

### Step 5: Change Scenario & Re-Run
Experiment with different rainfall values:
- `10 mm` → Low risk
- `50 mm` → Medium risk
- `150 mm` → Extreme high risk

Each simulation instantly updates the projection.

---

## 🔍 VERIFY: What Was Built

### Backend Endpoints (Test with curl or Postman)

#### 1. Get Live Weather
```bash
curl "http://localhost:5000/api/digital-twin/weather/current?latitude=19.2183&longitude=72.9781&location=Thane"
```

Expected response:
```json
{
  "dataType": "LIVE WEATHER",
  "location": "Thane",
  "temperature": 28,
  "humidity": 65,
  "rainfall": 0,
  "windSpeed": 12,
  "weatherCondition": "clear",
  "source": "mock",
  "timestamp": "2026-09-27T18:30:00Z"
}
```

#### 2. Run a Simulation
```bash
curl -X POST "http://localhost:5000/api/digital-twin/simulate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "requirementId": "demo-requirement",
    "rainfall": 80,
    "stormDuration": 2,
    "temperature": 28,
    "windSpeed": 12
  }'
```

Expected response:
```json
{
  "dataType": "SIMULATED RESULTS",
  "simulation": {
    "scenarioId": "cuid-...",
    "simulationId": "cuid-...",
    "baselineFulfillmentPercent": 100,
    "projectedFulfillmentPercent": 83,
    "unitsAtRisk": 50,
    "fulfillmentRisk": "HIGH",
    "affectedProviders": [ ... ]
  },
  "note": "These are PROJECTED/SIMULATED values. Real HRE data has NOT been modified."
}
```

#### 3. Get Social Signals
```bash
curl "http://localhost:5000/api/digital-twin/social-signals?location=Thane"
```

Expected response:
```json
{
  "dataType": "PUBLIC SIGNALS",
  "signals": [
    {
      "id": "demo-signal-1",
      "location": "Thane",
      "type": "WEATHER_REPORT",
      "severity": "MEDIUM",
      "message": "Heavy rainfall reported near major road corridor...",
      "label": "DEMO PUBLIC SIGNAL"
    }
  ]
}
```

---

## ✅ CRITICAL SUCCESS CHECKS

Run these tests to verify everything works:

### 1. Simulation Doesn't Modify Real Data ✅
Before simulation:
```bash
curl "http://localhost:5000/api/health"
# Response: { "status": "ok" }
```

After running a simulation, check that real bookings are unchanged:
- Query database: `SELECT * FROM "Booking" WHERE id = 'any-booking-id'`
- Should be **unchanged**

### 2. Live Weather Updates ✅
- Weather card shows current conditions
- Values match your weather provider output
- Timestamp is recent (within last 5 minutes)

### 3. Simulation Results are Labeled ✅
- All projected values show "SIMULATED" label
- Fulfillment risk color changes (HIGH=red, MEDIUM=yellow, LOW=green)
- Provider risks individually broken down

### 4. Demo Signals Clearly Marked ✅
- Every signal shows "🔔 DEMO PUBLIC SIGNAL"
- NOT "REAL SIGNAL" or unlabeled

### 5. Sliders Work Immediately ✅
- Change any slider → Simulation remains disabled until user clicks [Run]
- Click [Run] → Results update within 2-3 seconds
- Click [Reset] → All sliders return to defaults, results cleared

---

## 🐛 TROUBLESHOOTING

| Problem | Solution |
|---------|----------|
| Digital Twin page shows 404 | Restart dev server, ensure route added to router.tsx ✓ |
| Live weather shows "Unable to load" | Check server is running on port 5000, WEATHER_PROVIDER env var set |
| Simulation button disabled | Auth not working - ensure you're logged in (try /sign-in first) |
| Results show 0% fulfillment | Correct behavior if rainfall is extremely high (>100mm) |
| Sliders don't move | Browser cache - hard refresh (Ctrl+Shift+R) or clear dist/ |

---

## 📈 WHAT'S NEXT?

After testing works, move to the next phases:

### Phase 2: Add LLM Tools (Easiest)
**Time**: 1-2 hours

File: `server/src/services/assistant.ts`

Add these 4 tool definitions:
1. `get_current_weather` - Live weather query
2. `run_weather_simulation` - Trigger what-if scenario
3. `get_digital_twin_state` - Current HRE network state
4. `find_weather_resilient_alternatives` - Alternative providers

Then you can ask the chatbot:
> "What happens to my booking if it rains 80mm tomorrow?"

And it will:
1. Get current weather
2. Create simulation with rain parameter
3. Show affected providers
4. Suggest alternatives
5. Confirm nothing real changed

### Phase 3: Integrate with HRE
**Time**: 2-3 hours

- Add "[Simulate Weather]" button to Requirements page
- Add "[What-If]" button to Bookings page
- Add weather risk widget to Dashboard
- Add "Twin Utilization" chart to Analytics

### Phase 4: Maps & Geospatial
**Time**: 3-4 hours

- Extend MatchMap with risk overlay
- Show provider pins colored by risk (HIGH/MEDIUM/LOW)
- Add impact propagation flow diagram

---

## 🎯 DEMO FOR OTHERS

### 2-Minute Demo
1. Open Digital Twin page
2. Show live weather card ("This is LIVE from OpenWeather")
3. Change rainfall slider to 80mm
4. Click Run Simulation
5. Point to results: "300 units → 250 units projected"
6. Show provider breakdown: "Provider A at HIGH risk"
7. Say: "This is simulated. Real bookings are unchanged."

### 5-Minute Demo
- Do 2-minute above
- Then ask: "What if wind is 60 km/h instead?"
- Change wind slider, run again
- Show different result: "Now Provider C also affected"
- Point to impact description: "Shows the propagation: Rain → Logistics → Fulfillment"

### Full 15-Minute Demo
- 5-minute demo above
- Show social signals section (demo signals labeled)
- Show database records: SimulationScenario, SimulationResult, ImpactEvent tables
- Show API responses in Postman
- Explain the impact engine rules (transparent, not ML black-box)
- Show what-if vs real: "Simulation reads data but never writes"

---

## 📌 KEY FEATURES TO HIGHLIGHT

1. **LIVE WEATHER**: Not fake — actually fetches from OpenWeather (or mock)
2. **READ-ONLY**: Simulation NEVER modifies Booking, Inventory, Payment
3. **TRANSPARENT RULES**: Every impact has a clear reason (80mm → 80% logistics risk)
4. **DEMO LABELED**: All demo signals show "DEMO PUBLIC SIGNAL"
5. **CLEAR UI**: Results show "SIMULATED" vs "LIVE" data
6. **MULTI-PROVIDER**: Handles requirements from 2+ providers
7. **CASCADING IMPACTS**: Shows full chain (weather → logistics → fulfillment)

---

**You're ready! Open http://localhost:3100/digital-twin and test.**
