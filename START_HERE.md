# 🚀 START HERE - RUN THE WEATHER DIGITAL TWIN IN 3 STEPS

**Your system is ready**: Node.js v24.12.0 ✅ | npm 11.6.2 ✅

---

## 📋 WHAT YOU NEED TO DO

Open **3 terminal windows** and run these commands:

---

## **TERMINAL 1: Start Backend Server** ⚙️

```bash
cd "C:\Users\suraj\Desktop\Hack Celestial 3.0\HRE\server"
npm run dev
```

**Wait for this message:**
```
✓ Database connected
✓ Server running on http://localhost:5000
```

✅ Keep this terminal open and running

---

## **TERMINAL 2: Start Frontend** 🌐

Open a **NEW terminal window** (don't close Terminal 1)

```bash
cd "C:\Users\suraj\Desktop\Hack Celestial 3.0\HRE\client"
npm run dev
```

**Wait for this message:**
```
✓ Vite dev server running at http://localhost:3100
```

✅ Keep this terminal open and running

---

## **Open Your Browser** 🎯

Once **BOTH terminals** show the "running" messages:

```
Open: http://localhost:3100/digital-twin
```

You should immediately see:
- 📍 Live weather card (Thane, 28°C)
- 🎚️ What-if simulation sliders
- 📊 Empty results area

---

## 🎬 TRY THE DEMO (Right Now!)

### Step 1: Look at Live Weather
Left panel shows current weather (live from mock provider)

### Step 2: Change Rainfall Slider
Drag "Rainfall" slider from `0` to `80` mm

### Step 3: Click [Run Simulation]
Click the blue button

### Step 4: See Results
Right panel shows:
- **Fulfillment**: 83% (was 100%)
- **At Risk**: 50 units
- **Risk Level**: HIGH ⚠️
- **Provider A**: HIGH risk (80%)
- **Provider B**: LOW risk (10%)
- **Provider C**: MEDIUM risk (40%)

✅ All results marked as "SIMULATED"

### Step 5: Experiment
- Change rainfall to `150 mm` → See 60% fulfillment
- Change to `10 mm` → See 95% fulfillment
- See results update instantly

---

## 🎯 VERIFY EVERYTHING WORKS

### Check Live Weather API
Open a browser or use curl:
```
http://localhost:5000/api/digital-twin/weather/current?latitude=19.2183&longitude=72.9781
```

You should get JSON with weather data

### Check Frontend Loads
```
http://localhost:3100/digital-twin
```

You should see the Digital Twin page

### Check Simulation Runs
1. Go to http://localhost:3100/digital-twin
2. Drag rainfall slider to 80
3. Click [Run Simulation]
4. Results appear on right panel within 2-3 seconds

---

## ⚡ QUICK REFERENCE

| What | Where | Port |
|------|-------|------|
| Backend API | http://localhost:5000 | 5000 |
| Frontend | http://localhost:3100 | 3100 |
| Digital Twin | http://localhost:3100/digital-twin | 3100 |
| Health Check | http://localhost:5000/api/health | 5000 |

---

## 🛑 WHEN YOU'RE DONE

In each terminal, press: `Ctrl + C`

This stops the servers.

---

## ❓ ISSUES?

| Problem | Solution |
|---------|----------|
| Port 5000 in use | Another app using it - close that app or restart |
| Port 3100 in use | Same as above |
| Blank page | Hard refresh browser: `Ctrl + Shift + R` |
| "Cannot find module" | Run `npm install` in that directory |
| Weather shows error | That's OK - mock provider still works |
| Simulation not running | Check both terminals are showing "running" messages |

**Still stuck?** See `RUN_GUIDE.md` for detailed troubleshooting

---

## 📚 LEARN MORE

- **RUN_GUIDE.md** - Complete step-by-step with troubleshooting
- **WEATHER_DIGITAL_TWIN_QUICK_START.md** - Demo scenarios
- **WEATHER_DIGITAL_TWIN_STATUS.md** - What's implemented
- **WEATHER_DIGITAL_TWIN_FILES.md** - Code structure

---

**Ready? Open Terminal 1 and run the first command above!**

```bash
cd "C:\Users\suraj\Desktop\Hack Celestial 3.0\HRE\server"
npm run dev
```
