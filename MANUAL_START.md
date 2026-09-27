# 🚀 MANUAL START - Copy & Paste in PowerShell

**Use this method for reliable startup**

---

## WINDOW 1: Backend Server

Open a **NEW PowerShell** and copy/paste:

```powershell
cd "C:\Users\suraj\Desktop\Hack Celestial 3.0\HRE\server"
pnpm run dev
```

**Wait for:**
```
✓ Server running on http://localhost:5000
```

✅ **Keep running**

---

## WINDOW 2: Frontend (client-legacy)

Open a **SECOND PowerShell** and copy/paste:

```powershell
cd "C:\Users\suraj\Desktop\Hack Celestial 3.0\HRE"
pnpm -C client-legacy run dev
```

**Wait for:**
```
✓ Vite dev server running at http://localhost:3100
```

✅ **Keep running**

---

## WINDOW 3: AI Service (Optional)

Open a **THIRD PowerShell** and copy/paste:

```powershell
cd "C:\Users\suraj\Desktop\Hack Celestial 3.0\HRE\ai"
python app.py
```

**Wait for:**
```
INFO:     Uvicorn running on http://127.0.0.1:8008
```

---

## 🌐 THEN OPEN BROWSER

Once both terminals 1 & 2 show "running":

```
http://localhost:3100/digital-twin
```

---

## 🎮 DEMO (30 seconds)

1. Drag **Rainfall** to `80`
2. Click **[Run Simulation]**
3. See results: 83% fulfillment, 50 units at risk

---

**This is the most reliable way!** ✅
