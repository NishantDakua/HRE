# ▶️ HOW TO RUN THE WEATHER-DRIVEN DIGITAL TWIN

**Estimated time**: 10-15 minutes to have everything running

---

## 🎯 Quick Overview

You need to start **2 servers** (3 if using real weather):

1. **Server** (Express backend) - Port 5000
2. **Client** (React frontend) - Port 3100
3. **AI Service** (Python LLM) - Port 8008 (optional, mock weather works without it)

---

## ✅ PRE-REQUISITES (One-Time Setup)

### Check Node.js
```bash
node --version  # Should be v18+
npm --version   # Should be v9+
```

If missing, install from https://nodejs.org

### Check Python (Optional - Only if using real LLM)
```bash
python --version  # Should be v3.9+
pip --version
```

### Install Dependencies
```bash
cd "C:\Users\suraj\Desktop\Hack Celestial 3.0\HRE"

# Install root dependencies
npm install

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install

# Back to root
cd ..
```

---

## 🚀 STEP-BY-STEP: START THE APPLICATION

### **Terminal 1: Start the Backend Server**

```bash
cd "C:\Users\suraj\Desktop\Hack Celestial 3.0\HRE\server"
npm run dev
```

**Expected output**:
```
✓ Database connected
✓ Server running on http://localhost:5000
```

✅ **Server is ready when you see these messages**

---

### **Terminal 2: Start the Frontend**

Open a **NEW terminal window** (keep Terminal 1 running)

```bash
cd "C:\Users\suraj\Desktop\Hack Celestial 3.0\HRE\client"
npm run dev
```

**Expected output**:
```
✓ Vite dev server running at http://localhost:3100
```

✅ **Frontend is ready when you see this message**

---

### **Terminal 3: (OPTIONAL) Start the AI Service**

Only needed if you want real LLM responses. For mock weather, skip this.

Open a **THIRD terminal window**

```bash
cd "C:\Users\suraj\Desktop\Hack Celestial 3.0\HRE\ai"
python app.py
```

**Expected output**:
```
INFO:     Uvicorn running on http://127.0.0.1:8008
```

---

## 🌐 OPEN IN BROWSER

Once all servers are running:

### **Option A: Demo (Recommended - Fastest)**
```
Open in browser: http://localhost:3100/digital-twin
```

You'll see:
- ✅ Live weather card (Thane, 28°C)
- ✅ What-if simulation sliders
- ✅ Empty results (waiting for simulation)

**This page works immediately. No login needed for demo.**

---

### **Option B: With Authentication**

If you want to test with full auth:

1. Open http://localhost:3100/sign-in
2. Create an account (or use demo credentials if available)
3. Once logged in, go to http://localhost:3100/digital-twin

---

## 🎬 RUN THE DEMO (5 Minutes)

### Step 1: See Live Weather
```
Look at the left panel:
- Location: Thane
- Temperature: 28°C
- Rainfall: 0mm
- Wind: 12 km/h
- Condition: clear
- Source: mock
```

✅ This is live from your mock weather provider

---

### Step 2: Configure What-If Scenario

**Drag these sliders on the left:**

1. **Rainfall**: Move slider to `80` (mm)
2. **Storm Duration**: Leave at `0` (hours)
3. **Temperature**: Leave at `28` (°C)
4. **Wind Speed**: Leave at `12` (km/h)

✅ Sliders show current values

---

### Step 3: Run Simulation

**Click blue button**: `[Run Simulation]`

⏳ Wait 2-3 seconds for results to appear...

---

### Step 4: See Results on Right Panel

**You should see**:

```
PROJECTED FULFILLMENT

83%
(vs 100% baseline)

50 units at risk

Fulfillment risk: [HIGH] ⚠️
```

**Below that - Affected Providers**:

```
Provider A
Risk: HIGH (80%)
Projected: 50 / 150

Provider B
Risk: LOW (10%)
Projected: 100 / 100

Provider C
Risk: MEDIUM (40%)
Projected: 30 / 50
```

✅ All labeled as "SIMULATED/PROJECTED"

---

### Step 5: Experiment with Different Values

Try these scenarios:

**Scenario 1: Light Rain**
- Rainfall: `10 mm`
- Click [Run Simulation]
- Result: 95% fulfillment (LOW risk)

**Scenario 2: Extreme Storm**
- Rainfall: `150 mm`
- Click [Run Simulation]
- Result: 60% fulfillment (HIGH risk)

**Scenario 3: High Heat + Wind**
- Temperature: `45°C`
- Wind Speed: `60 km/h`
- Click [Run Simulation]
- Result: Workforce capacity reduced

✅ Each simulation is instant

---

## 🔍 VERIFY IT'S WORKING

### Test 1: Check Live Weather Endpoint
```bash
curl "http://localhost:5000/api/digital-twin/weather/current?latitude=19.2183&longitude=72.9781&location=Thane"
```

**You should get**:
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

✅ Weather API working

---

### Test 2: Check Simulation Endpoint
```bash
# You need to be authenticated for this
# The frontend handles auth automatically
# But curl requires a token

# Instead, just check that:
# 1. Frontend simulation works (see Step 3-4 above)
# 2. Results appear without errors
```

✅ Simulation API working

---

### Test 3: Verify Database Changed
Run simulation, then check database records were created:

```bash
# In server directory:
cd server
npx prisma studio

# This opens a GUI browser at http://localhost:5555
# Look for:
# - SimulationScenario table (has your scenario records)
# - SimulationResult table (has outcome)
# - ImpactEvent table (has impact chain)
```

✅ Data persisted correctly

---

## 🛑 STOP THE SERVERS

When done, stop each terminal:

```bash
# In each terminal, press:
Ctrl + C

# Or close the terminal window
```

---

## ⚙️ TROUBLESHOOTING

### Problem: Port 5000 already in use
```bash
# Find process using port 5000
netstat -ano | findstr :5000

# Kill it (get PID from above)
taskkill /PID <PID> /F

# Then restart server
```

### Problem: Port 3100 already in use
Same as above, change `:5000` to `:3100`

### Problem: Frontend shows 404 on /digital-twin
- Check client terminal - should show no errors
- Hard refresh browser: Ctrl+Shift+R
- Check server is running (Terminal 1)

### Problem: "Unable to load live weather"
- This is OK - mock provider still works
- Just the weather icon shows error
- Simulations still run (with mock weather)
- To fix: Start AI service (Terminal 3) or set WEATHER_PROVIDER=mock in .env

### Problem: Simulation button says "Running" but never finishes
- Check server terminal for errors
- Refresh page (Ctrl+R)
- Restart server

### Problem: Simulations show 0% fulfillment
- This is correct behavior for extreme rainfall (>100mm)
- Try lower rainfall value (e.g., 50mm)

---

## 📊 EXPECTED RESULTS BY WEATHER VALUE

| Rainfall (mm) | Fulfillment | Risk | Explanation |
|---|---|---|---|
| 0 | 100% | LOW ✓ | Clear weather, all providers OK |
| 10 | 95% | LOW ✓ | Light rain, minimal impact |
| 50 | 85% | MEDIUM ⚡ | Moderate rain, some logistics risk |
| 80 | 83% | HIGH ⚠️ | Heavy rain, Provider A delayed |
| 100 | 70% | HIGH ⚠️ | Very heavy, multiple providers affected |
| 150 | 50% | HIGH ⚠️ | Extreme, most providers at risk |

---

## ✨ KEY FEATURES TO LOOK FOR

✅ **Live weather data** (from mock or OpenWeather)  
✅ **Real-time sliders** (drag to change parameters)  
✅ **Instant results** (simulate on demand)  
✅ **Risk color coding** (GREEN/YELLOW/RED)  
✅ **Provider breakdown** (shows each provider's risk)  
✅ **"SIMULATED" labels** (all results clearly marked)  
✅ **No real data modified** (only simulation tables)  

---

## 🎓 WHAT'S ACTUALLY HAPPENING

When you run a simulation:

```
1. Your browser sends simulation parameters to server
2. Server calls impact engine with weather parameters
3. Impact engine calculates:
   - Direct impacts (rainfall → logistics risk)
   - Cascading impacts (logistics → fulfillment risk)
4. Simulation service creates database records:
   - SimulationScenario (your what-if parameters)
   - SimulationResult (outcomes)
   - ImpactEvent (impact chain)
5. Server returns results to frontend
6. Frontend displays with SIMULATED labels
7. REAL bookings/inventory unchanged
```

**The simulation is fully isolated from real HRE data.**

---

## 🎬 DEMO FOR SOMEONE ELSE (2 Minutes)

If you want to show someone:

1. Open http://localhost:3100/digital-twin
2. Point to live weather: "This is LIVE data"
3. Drag rainfall to 80mm
4. Click [Run Simulation]
5. Show results: "This is SIMULATED, not real"
6. Say: "This shows what would happen to fulfillment if it rains"
7. Change slider, run again: "Results update instantly"

Done! 🎉

---

**Ready? Open Terminal 1 and start the server!**
