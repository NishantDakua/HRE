# 🚀 STARTUP GUIDE - Using pnpm + client-legacy

**You are running with:**
- Package Manager: **pnpm** (not npm)
- Frontend: **client-legacy** (not client)

---

## 📋 THE 3-STEP STARTUP

### **WINDOW 1: Backend Server**

```powershell
cd "C:\Users\suraj\Desktop\Hack Celestial 3.0\HRE\server"
pnpm run dev
```

**Wait for:**
```
✓ Database connected
✓ Server running on http://localhost:5000
```

✅ **Keep this running**

---

### **WINDOW 2: Frontend (client-legacy)**

```powershell
cd "C:\Users\suraj\Desktop\Hack Celestial 3.0\HRE\client-legacy"
pnpm run dev
```

**Wait for:**
```
✓ Vite dev server running at http://localhost:3100
```

✅ **Keep this running**

---

### **WINDOW 3: AI Service**

```powershell
cd "C:\Users\suraj\Desktop\Hack Celestial 3.0\HRE\ai"
python app.py
```

**Wait for:**
```
INFO:     Uvicorn running on http://127.0.0.1:8008
```

⚠️ **Optional** - Skip if Python not installed

✅ **Keep this running**

---

## 🌐 OPEN BROWSER

Once all terminals show "running":

```
http://localhost:3100/digital-twin
```

---

## 🎮 TRY THE DEMO

1. Drag **Rainfall** slider to `80`
2. Click **[Run Simulation]**
3. See results on right panel

Expected:
- 83% fulfillment
- 50 units at risk
- Provider risk breakdown

---

## 📊 PORTS & URLS

```
Backend:      http://localhost:5000
Frontend:     http://localhost:3100
Digital Twin: http://localhost:3100/digital-twin
AI Service:   http://127.0.0.1:8008
```

---

## ✅ DEPENDENCIES

**Already installed** via pnpm (monorepo setup):

```
root/
├── server/
│   └── node_modules/
├── client-legacy/
│   └── node_modules/
├── ai/
│   └── venv/ or pip packages
└── node_modules/ (root level)
```

If you need to install/reinstall:

```powershell
# Install all dependencies (from root)
cd "C:\Users\suraj\Desktop\Hack Celestial 3.0\HRE"
pnpm install

# Or specific package
cd server && pnpm install
cd ../client-legacy && pnpm install
```

---

## 🛑 STOP EVERYTHING

In each PowerShell window:

```
Ctrl + C
```

---

## ⚡ QUICK COMMANDS REFERENCE

| What | Command |
|------|---------|
| Backend | `cd server && pnpm run dev` |
| Frontend | `cd client-legacy && pnpm run dev` |
| AI | `cd ai && python app.py` |
| Install all | `pnpm install` |
| Install server | `cd server && pnpm install` |
| Install client | `cd client-legacy && pnpm install` |

---

## 🧪 VERIFY

```powershell
# Check backend
curl http://localhost:5000/api/health

# Check weather API
curl "http://localhost:5000/api/digital-twin/weather/current?latitude=19.2183&longitude=72.9781"

# Check frontend loads
curl http://localhost:3100
```

---

## 📁 WHAT'S WHAT

```
HRE/
├── server/              ← Backend (Express + pnpm)
│   ├── src/
│   │   ├── services/digitalTwin/  ← Weather & simulation
│   │   └── routes/digitalTwin.ts  ← API endpoints
│   └── pnpm run dev              ← Start here
│
├── client-legacy/       ← Frontend (React + pnpm) 
│   ├── src/
│   │   ├── pages/DigitalTwin.tsx  ← What-if UI
│   │   └── hooks/                 ← New hooks
│   └── pnpm run dev              ← Start here
│
├── ai/                  ← AI Service (Python)
│   └── python app.py   ← Start here
│
└── pnpm-workspace.yaml ← Monorepo config
```

---

## ✨ READY TO GO!

**Copy & paste 3 commands:**

Window 1:
```powershell
cd "C:\Users\suraj\Desktop\Hack Celestial 3.0\HRE\server"
pnpm run dev
```

Window 2:
```powershell
cd "C:\Users\suraj\Desktop\Hack Celestial 3.0\HRE\client-legacy"
pnpm run dev
```

Window 3:
```powershell
cd "C:\Users\suraj\Desktop\Hack Celestial 3.0\HRE\ai"
python app.py
```

Then open: `http://localhost:3100/digital-twin`

---

**Start now!** 🚀
