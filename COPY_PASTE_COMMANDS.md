# 📋 COPY & PASTE COMMANDS - Run Everything

**Do this**. Don't read explanations. Just copy and paste.

---

## 🖥️ Open PowerShell 3 Times

You need **3 PowerShell windows** open. Open them all before starting.

---

# ✅ COMMAND 1: Backend (Paste in PowerShell #1)

```powershell
cd "C:\Users\suraj\Desktop\Hack Celestial 3.0\HRE\server"
npm run dev
```

**Wait for:**
```
✓ Database connected
✓ Server running on http://localhost:5000
```

✅ **Leave this running. Don't close.**

---

# ✅ COMMAND 2: Frontend (Paste in PowerShell #2)

```powershell
cd "C:\Users\suraj\Desktop\Hack Celestial 3.0\HRE\client"
npm run dev
```

**Wait for:**
```
✓ Vite dev server running at http://localhost:3100
```

✅ **Leave this running. Don't close.**

---

# ✅ COMMAND 3: AI Service (Paste in PowerShell #3)

```powershell
cd "C:\Users\suraj\Desktop\Hack Celestial 3.0\HRE\ai"
python app.py
```

**Wait for:**
```
INFO:     Uvicorn running on http://127.0.0.1:8008
```

⚠️ **Optional**: If you get "python not found", just close this window. Everything else works.

✅ **Leave this running. Don't close.**

---

# 🌐 OPEN BROWSER (All 3 terminals running)

**Copy and paste into browser:**
```
http://localhost:3100/digital-twin
```

---

# 🎮 TRY IT RIGHT NOW

**On the page:**

1. Find the **Rainfall slider** (left side)
2. **Drag it** from `0` to `80`
3. **Click** blue button `[Run Simulation]`
4. **Look right side** - results appear!

**You should see:**
- ⚠️ **83%** fulfillment
- **50 units** at risk
- **Provider risks** breakdown
- All labeled **SIMULATED**

✅ **It works!**

---

# 🧪 QUICK VERIFICATION

**In a 4th PowerShell, copy this:**

```powershell
curl "http://localhost:5000/api/health"
```

**Should return:**
```
{"status":"ok"}
```

If yes ✅ Backend working.

---

# 🛑 WHEN DONE

In each PowerShell window:
```
Press: Ctrl + C
```

Then close windows.

---

# 📱 WHAT YOU GET

- **Frontend**: http://localhost:3100 (Full UI)
- **Digital Twin**: http://localhost:3100/digital-twin (What-if simulator)
- **Backend API**: http://localhost:5000 (REST endpoints)
- **AI Service**: http://127.0.0.1:8008 (LLM inference)
- **Chat**: Works in dashboard
- **Real-time**: Simulations instant
- **Live Weather**: From mock or OpenWeather

---

# ⚡ TL;DR

```
Terminal 1: cd server && npm run dev
Terminal 2: cd client && npm run dev  
Terminal 3: cd ai && python app.py
Browser:   http://localhost:3100/digital-twin
Drag:      Rainfall to 80
Click:     Run Simulation
See:       Results with risk levels ✓
```

---

**That's it. Do it now!** 🚀
