# 🚀 COMPLETE STARTUP GUIDE - Run Everything

**Run time**: 5-10 minutes to have everything operational  
**Requirements**: Node.js v18+, npm v9+, Python 3.9+ (optional for AI)

---

## 📋 WHAT YOU'LL RUN

```
┌─────────────────────────────────────────────────────────┐
│                    YOUR APPLICATION                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. BACKEND (Express.js)                              │
│     - API routes (/api/chat, /api/digital-twin, etc)   │
│     - Database (PostgreSQL via Prisma)                 │
│     - Tool execution (LLM tools)                       │
│     Port: 5000                                          │
│                                                         │
│  2. FRONTEND (React + Vite)                            │
│     - Web UI (dashboard, discover, digital twin)       │
│     - Real-time chat widget                            │
│     - What-if simulation interface                     │
│     Port: 3100                                          │
│                                                         │
│  3. AI SERVICE (Python FastAPI)                        │
│     - Qwen LLM inference (local GPU)                   │
│     - Speech-to-text (Whisper)                         │
│     - Streaming chat responses                         │
│     Port: 8008                                          │
│                                                         │
│  4. DIGITAL TWIN (Integrated in Backend)               │
│     - Weather integration                              │
│     - Impact engine                                    │
│     - What-if simulations                              │
│     - Accessible via /api/digital-twin                │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

# 🎯 QUICK START (Copy & Paste Commands)

## Terminal 1: Start Backend Server

```bash
cd "C:\Users\suraj\Desktop\Hack Celestial 3.0\HRE\server"
npm run dev
```

**Wait for:**
```
✓ Database connected
✓ Server running on http://localhost:5000
```

---

## Terminal 2: Start Frontend

```bash
cd "C:\Users\suraj\Desktop\Hack Celestial 3.0\HRE\client"
npm run dev
```

**Wait for:**
```
✓ Vite dev server running at http://localhost:3100
```

---

## Terminal 3: Start AI Service (OPTIONAL)

```bash
cd "C:\Users\suraj\Desktop\Hack Celestial 3.0\HRE\ai"
python app.py
```

**Wait for:**
```
INFO:     Uvicorn running on http://127.0.0.1:8008
```

⚠️ **Note**: If you don't have Python or don't want to run LLM, **skip this step**. The app works fine with mock responses.

---

## Browser: Open Application

```
http://localhost:3100
```

You'll see the landing page. Then navigate to:
- **Digital Twin**: http://localhost:3100/digital-twin
- **Dashboard**: http://localhost:3100/dashboard
- **Discover**: http://localhost:3100/discover

---

# 📖 DETAILED STEP-BY-STEP

## PRE-SETUP: Check Your System

Open PowerShell and run:

```powershell
node --version
npm --version
python --version
```

**Expected output:**
```
v24.12.0   (or any v18+)
11.6.2     (or any v9+)
3.11.7     (or any v3.9+ - only needed for AI)
```

If Node/npm are missing, install from https://nodejs.org

---

## STEP 1: Install All Dependencies

**One time only!** Run from root directory:

```bash
cd "C:\Users\suraj\Desktop\Hack Celestial 3.0\HRE"

# Install workspace dependencies
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

**Expected**: No errors, lots of packages installed

---

## STEP 2A: Start Backend Server

**Create a NEW terminal** (or use Terminal 1)

```bash
cd "C:\Users\suraj\Desktop\Hack Celestial 3.0\HRE\server"
npm run dev
```

**Watch for these messages:**
```
✓ Database connected
✓ Server running on http://localhost:5000
```

✅ **Backend is ready**

**Don't close this terminal** - keep it running

---

## STEP 2B: Start Frontend

**Create a SECOND NEW terminal** (don't close Terminal 1)

```bash
cd "C:\Users\suraj\Desktop\Hack Celestial 3.0\HRE\client"
npm run dev
```

**Watch for:**
```
✓ Vite dev server running at http://localhost:3100
```

✅ **Frontend is ready**

**Don't close this terminal** - keep it running

---

## STEP 2C: Start AI Service (Optional but Recommended)

**Create a THIRD NEW terminal** (don't close 1 or 2)

**First, check if Python is available:**
```bash
python --version
```

If you get version number, continue:

```bash
cd "C:\Users\suraj\Desktop\Hack Celestial 3.0\HRE\ai"
python app.py
```

**Watch for:**
```
INFO:     Uvicorn running on http://127.0.0.1:8008
```

✅ **AI Service is ready**

**Note**: If Python not installed or you don't want LLM, this is optional. Everything else works without it.

---

# 🌐 OPEN IN BROWSER

Once you have 2+ terminals showing "running" messages:

## Option A: See the Digital Twin (Recommended First)

```
http://localhost:3100/digital-twin
```

**You'll see:**
- Live weather card
- What-if simulation sliders
- Results area

**Try immediately:**
1. Drag Rainfall slider to 80
2. Click [Run Simulation]
3. See results update

---

## Option B: See the Full Dashboard

```
http://localhost:3100
```

**You'll see:**
- Landing page with features
- Navigation menu
- Option to sign in

---

## Option C: Use the Chat

```
http://localhost:3100/dashboard
```

Then look for the chat widget on the dashboard. You can:
- Ask about resources
- Book items
- Check weather (if AI running)
- Run simulations

---

# 🧪 VERIFY EVERYTHING IS WORKING

Run these checks in order:

### Check 1: Backend API Health
```bash
curl http://localhost:5000/api/health
```

**Response should be:**
```json
{"status": "ok"}
```

✅ Backend working

---

### Check 2: Weather API
```bash
curl "http://localhost:5000/api/digital-twin/weather/current?latitude=19.2183&longitude=72.9781&location=Thane"
```

**Response should be JSON with weather data:**
```json
{
  "dataType": "LIVE WEATHER",
  "location": "Thane",
  "temperature": 28,
  ...
}
```

✅ Digital Twin weather API working

---

### Check 3: Frontend Loads
```
Open browser: http://localhost:3100
```

**Should see:**
- HRE landing page with logo
- "Welcome to HRE" or similar
- Navigation working
- No console errors

✅ Frontend working

---

### Check 4: Digital Twin Page
```
Open browser: http://localhost:3100/digital-twin
```

**Should see:**
- Left: Live weather card + sliders
- Right: Empty results area
- No errors

✅ Digital Twin working

---

### Check 5: Run a Simulation
1. Go to http://localhost:3100/digital-twin
2. Drag Rainfall slider to 80
3. Click [Run Simulation]
4. Results appear within 3 seconds

✅ Full simulation pipeline working

---

### Check 6: AI Service (Optional)
```bash
curl http://127.0.0.1:8008/health
```

**Response should be:**
```json
{"status": "ok"}
```

✅ AI Service running

---

# 📊 COMPLETE SYSTEM STATE

When everything is working, you should have:

```
┌────────────────────────────────────────────┐
│           TERMINAL 1: BACKEND              │
├────────────────────────────────────────────┤
│ ✓ Database connected                       │
│ ✓ Server running on port 5000              │
│ ✓ API routes ready                         │
│ ✓ Digital Twin routes ready                │
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│           TERMINAL 2: FRONTEND             │
├────────────────────────────────────────────┤
│ ✓ Vite dev server running on port 3100     │
│ ✓ React components compiled                │
│ ✓ Hot reload ready                         │
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│          TERMINAL 3: AI SERVICE            │
├────────────────────────────────────────────┤
│ ✓ FastAPI running on port 8008             │
│ ✓ Qwen LLM loaded                          │
│ ✓ Ready for chat inference                 │
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│           BROWSER: RUNNING APP             │
├────────────────────────────────────────────┤
│ ✓ Frontend loads at localhost:3100         │
│ ✓ Digital Twin page at /digital-twin       │
│ ✓ Chat widget functional                   │
│ ✓ Real-time simulations working            │
│ ✓ Weather data live                        │
└────────────────────────────────────────────┘
```

---

# 🎬 DEMO FLOW (5 Minutes)

### 1. Show Live Weather (30 seconds)
- Go to http://localhost:3100/digital-twin
- Point to weather card: "This is LIVE weather for Thane"

### 2. Run What-If Simulation (2 minutes)
- Drag Rainfall slider to 80mm
- Click [Run Simulation]
- Show results: "300 units → 250 units projected"
- Show provider risks: "Provider A is HIGH risk"

### 3. Change Scenario (1 minute)
- Change rainfall to 150mm
- Run again
- Show worse results: "Now 50% fulfillment"

### 4. Explain Key Features (1.5 minutes)
- Point to "SIMULATED" label: "Results are projected, not real"
- Show color coding: "Red=HIGH risk, Yellow=MEDIUM, Green=LOW"
- Say: "Real bookings unchanged - this is simulation only"

---

# 🛑 WHEN YOU'RE DONE

**Stop all servers:**

In each terminal, press:
```
Ctrl + C
```

Then close the terminal windows.

---

# ⚙️ CONFIGURATION

### Backend (server/.env)
```
DATABASE_URL=postgresql://...  # Already configured
WEATHER_PROVIDER=mock          # Use mock or openweather
WEATHER_API_KEY=...            # Optional for real weather
AI_SERVICE_URL=http://localhost:8008
```

### Frontend (client/.env)
```
VITE_API_URL=http://localhost:5000
```

### AI (ai/.env)
```
LLM_MODEL=Qwen/Qwen3-VL-4B-Instruct
LLM_4BIT=1
SPEECH_DEVICE=cpu
```

---

# 🆘 TROUBLESHOOTING

| Issue | Solution |
|-------|----------|
| Port 5000 in use | `netstat -ano \| findstr :5000` then `taskkill /PID <PID> /F` |
| Port 3100 in use | Same as above, change :5000 to :3100 |
| "Cannot find module" | Run `npm install` in that directory |
| Frontend blank page | Hard refresh: `Ctrl+Shift+R` |
| AI Service won't start | Python not installed - skip it, everything else works |
| Simulation shows error | Check backend terminal for error messages |
| Weather shows "Unable to load" | Normal if mock provider - simulations still work |
| Database error | Check server/.env has DATABASE_URL |

---

# 📚 WHAT EACH COMPONENT DOES

## Backend Server (Express)
- Handles all API requests
- Connects to PostgreSQL database
- Executes LLM tools
- Runs Digital Twin simulations
- Manages sessions and bookings

## Frontend (React)
- User interface for browsing and booking
- Chat widget for conversations
- Digital Twin what-if interface
- Dashboard and analytics
- Real-time updates via API

## AI Service (Python/FastAPI)
- Runs Qwen LLM locally
- Processes chat messages
- Returns streaming text responses
- Handles tool calls from backend
- Transcribes speech (optional)

## Digital Twin (Integrated in Backend)
- Fetches live weather
- Calculates impact propagation
- Runs what-if simulations
- Stores scenario results
- Never modifies real data

---

# 🎯 QUICK REFERENCE

```
BACKEND:     http://localhost:5000
FRONTEND:    http://localhost:3100
AI SERVICE:  http://127.0.0.1:8008
DATABASE:    PostgreSQL (configured in .env)

KEY PAGES:
- Home:          http://localhost:3100/
- Digital Twin:  http://localhost:3100/digital-twin
- Discover:      http://localhost:3100/discover
- Dashboard:     http://localhost:3100/dashboard
- Sign In:       http://localhost:3100/sign-in

API ENDPOINTS:
- Health:        GET  http://localhost:5000/api/health
- Weather:       GET  http://localhost:5000/api/digital-twin/weather/current
- Simulate:      POST http://localhost:5000/api/digital-twin/simulate
- Chat:          POST http://localhost:5000/api/chat
- Bookings:      GET  http://localhost:5000/api/bookings/seeker
```

---

# ✨ YOU'RE ALL SET!

**Next step**: 
1. Open 3 terminals
2. Run the 3 commands above
3. Wait for "running" messages
4. Open http://localhost:3100/digital-twin
5. Drag rainfall slider to 80
6. Click [Run Simulation]
7. See results! 🎉

---

**Ready? Start Terminal 1 with:**
```bash
cd "C:\Users\suraj\Desktop\Hack Celestial 3.0\HRE\server"
npm run dev
```
