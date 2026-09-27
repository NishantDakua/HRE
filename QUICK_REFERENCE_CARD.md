# ⚡ QUICK REFERENCE CARD

Print this or keep it open while running.

---

## 🎯 THE 3-STEP STARTUP

### Step 1️⃣ Backend
```
PowerShell 1:
cd "C:\Users\suraj\Desktop\Hack Celestial 3.0\HRE\server"
npm run dev

✅ Wait for: Server running on http://localhost:5000
```

### Step 2️⃣ Frontend  
```
PowerShell 2:
cd "C:\Users\suraj\Desktop\Hack Celestial 3.0\HRE\client"
npm run dev

✅ Wait for: Vite dev server running at http://localhost:3100
```

### Step 3️⃣ AI (Optional)
```
PowerShell 3:
cd "C:\Users\suraj\Desktop\Hack Celestial 3.0\HRE\ai"
python app.py

✅ Wait for: Uvicorn running on http://127.0.0.1:8008
```

---

## 🌐 THEN OPEN BROWSER

```
http://localhost:3100/digital-twin
```

---

## 🎮 DEMO (5 Seconds)

1. **Drag** rainfall slider → 80
2. **Click** [Run Simulation]
3. **See** results on right

Result: 83% fulfillment, 50 units at risk ✓

---

## 🔗 IMPORTANT PORTS

```
Backend:    5000   http://localhost:5000
Frontend:   3100   http://localhost:3100
AI:         8008   http://127.0.0.1:8008
```

---

## 📍 KEY PAGES

```
Home:           http://localhost:3100
Digital Twin:   http://localhost:3100/digital-twin
Dashboard:      http://localhost:3100/dashboard
Discover:       http://localhost:3100/discover
Chat:           Built into dashboard
```

---

## 🧪 TEST COMMANDS

```
Health check:
curl http://localhost:5000/api/health

Weather API:
curl "http://localhost:5000/api/digital-twin/weather/current?latitude=19.2183&longitude=72.9781"

AI Health:
curl http://127.0.0.1:8008/health
```

---

## 🆘 QUICK FIXES

| Issue | Fix |
|-------|-----|
| Port in use | Close other apps on that port |
| Module not found | Run: npm install |
| Blank page | Hard refresh: Ctrl+Shift+R |
| AI won't start | Skip - everything works without it |
| Simulation slow | Normal - first run slower |

---

## 🛑 STOP EVERYTHING

In each PowerShell: **Ctrl + C**

---

## ✨ FEATURES

- ✅ Live weather (mock or real API)
- ✅ Real-time what-if simulation
- ✅ Multi-provider impact analysis
- ✅ Cascading risk calculation
- ✅ Risk color coding (RED/YELLOW/GREEN)
- ✅ No real data modified
- ✅ All results labeled SIMULATED

---

## 📊 EXPECTED RESULTS

After running simulation with 80mm rainfall:

```
Fulfillment:     83% (was 100%)
At Risk:         50 units
Risk Level:      HIGH ⚠️
Provider A:      HIGH (80%) → 50/150 units
Provider B:      LOW (10%) → 100/100 units  
Provider C:      MEDIUM (40%) → 30/50 units
```

---

## 🎬 DEMO NARRATIVE

> "This is the HRE Digital Twin. It simulates weather impacts on fulfillment.
> 
> **Live weather** shows current conditions.
> 
> When I change rainfall to 80mm and run simulation:
> - Calculates how weather impacts each provider
> - Shows cascading effects
> - Projects fulfillment drops to 83%
> 
> **Important**: This is simulated. Real bookings unchanged.
> 
> Try different scenarios... results update instantly."

---

## 📁 PROJECT STRUCTURE

```
HRE/
├── server/              ← Backend (Express)
│   ├── src/
│   │   ├── services/
│   │   │   └── digitalTwin/   ← New weather/simulation code
│   │   └── routes/
│   │       └── digitalTwin.ts ← New API endpoints
│   └── npm run dev
│
├── client/              ← Frontend (React)
│   ├── src/
│   │   ├── pages/
│   │   │   └── DigitalTwin.tsx ← New what-if page
│   │   └── hooks/
│   │       ├── useWeather.ts   ← New weather hook
│   │       └── useDigitalTwin.ts ← New simulation hook
│   └── npm run dev
│
└── ai/                  ← AI Service (Python)
    ├── app.py          ← FastAPI + Qwen LLM
    └── python app.py
```

---

## 💾 DATABASE

Auto-connected via Prisma.

New tables created:
- WeatherObservation
- SimulationScenario
- SimulationResult
- ImpactEvent

Existing tables untouched:
- User, Business, Resource, Booking, etc.

---

## ✅ CHECKLIST: EVERYTHING RUNNING

- [ ] PowerShell 1: Backend running on 5000
- [ ] PowerShell 2: Frontend running on 3100
- [ ] PowerShell 3: AI running on 8008 (or skipped)
- [ ] Browser opens http://localhost:3100
- [ ] Digital Twin page loads
- [ ] Live weather displays
- [ ] Sliders work
- [ ] [Run Simulation] button works
- [ ] Results appear

All checked? You're done! 🎉

---

## 📞 NEED HELP?

**See detailed docs:**
- `COMPLETE_STARTUP_GUIDE.md` - Full walkthrough
- `VISUAL_WALKTHROUGH.md` - What you'll see
- `RUN_GUIDE.md` - Troubleshooting
- `WEATHER_DIGITAL_TWIN_STATUS.md` - What's implemented

---

**Copy, paste, run, enjoy!** 🚀
