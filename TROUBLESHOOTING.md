# Troubleshooting Guide - MarketForge Pro

## 🔧 Common Issues and Solutions

### Issue 1: CORS Errors in Browser Console

**Symptoms:**
```
Cross-Origin Request Blocked: The Same Origin Policy disallows reading the remote resource
```

**Cause:** Backend server not responding or crashed

**Solution:**
```bash
# Kill and restart backend
cd /home/dev/projects/electron-app/marketforge-pro-dev-testing
source venv/bin/activate
uvicorn backend.api.main:app --host 0.0.0.0 --port 8000 --reload
```

**Verify:**
```bash
curl http://localhost:8000/api/health
# Should return: {"api":"healthy","tradingview_bridge":"active","resonance":"healthy"}
```

---

### Issue 2: WebSocket Connection Failed (Vite HMR)

**Symptoms:**
```
[vite] failed to connect to websocket
Firefox can't establish a connection to the server at ws://localhost:3000/
```

**Cause:** Normal behavior - Vite hot module reload trying to connect

**Solution:** This is a **warning, not an error**. The app still works!

If it bothers you:
```bash
# Restart frontend
npm run dev
```

---

### Issue 3: Chart Crashes or Doesn't Display

**Symptoms:**
- Chart component shows error
- No visualization after executing strategy

**Causes & Solutions:**

**A) No data returned:**
```bash
# Check if backend returns data
curl "http://localhost:8000/api/chart/data/bitcoin?timeframe=1h&source=coingecko"
# Should return JSON with candles array
```

**B) TypeScript errors:**
```bash
# Check for compilation errors
npx tsc --noEmit
```

**C) Lightweight Charts not installed:**
```bash
npm install lightweight-charts
```

---

### Issue 4: TA-Lib Import Error

**Symptoms:**
```
ModuleNotFoundError: No module named 'talib'
```

**Solution:**
```bash
# 1. Install system TA-Lib
cd /tmp
wget http://prdownloads.sourceforge.net/ta-lib/ta-lib-0.4.0-src.tar.gz
tar -xzf ta-lib-0.4.0-src.tar.gz
cd ta-lib
./configure --prefix=/usr/local
make
sudo make install
sudo ldconfig

# 2. Install Python wrapper
cd /home/dev/projects/electron-app/marketforge-pro-dev-testing
source venv/bin/activate
pip install ta-lib
```

**Verify:**
```bash
python -c "import talib; print('TA-Lib OK')"
```

---

### Issue 5: Pine Script Translation Fails

**Symptoms:**
```json
{
  "success": false,
  "error": "..."
}
```

**Solutions:**

**A) Check Pine Script version:**
```pinescript
//@version=5  # Must be v5 or v6
```

**B) Use supported functions only:**
```bash
curl http://localhost:8000/api/pinescript/supported-functions
```

**C) Check syntax:**
- Missing parentheses: `ta.sma(close, 14)` not `ta.sma close 14`
- Correct if/strategy syntax:
  ```pinescript
  if condition
      strategy.entry("Long", strategy.long)
  ```

---

### Issue 6: Backend Won't Start

**Symptoms:**
```
ModuleNotFoundError: No module named 'fastapi'
```

**Solution:**
```bash
source venv/bin/activate
pip install -r backend/requirements.txt
```

**Verify virtual environment:**
```bash
which python
# Should show: /home/dev/projects/electron-app/marketforge-pro-dev-testing/venv/bin/python
```

---

### Issue 7: Frontend Won't Build

**Symptoms:**
```
Cannot find module 'xyz'
```

**Solution:**
```bash
npm install
npm run dev
```

---

### Issue 8: Port Already in Use

**Symptoms:**
```
Error: Address already in use (port 8000)
```

**Solution:**
```bash
# Find process using port
lsof -i :8000

# Kill it
kill -9 <PID>

# Or use different port
uvicorn backend.api.main:app --port 8001
```

---

### Issue 9: Strategy Execution Returns No Orders

**Symptoms:**
- Execution succeeds but orders array is empty
- Chart shows no buy/sell markers

**Causes & Solutions:**

**A) Strategy conditions not met:**
```pinescript
# Test with simpler conditions
if close > open  # Always triggers
    strategy.entry("Long", strategy.long)
```

**B) Not enough data:**
```bash
# Increase data limit
curl -X POST .../execute -d '{"...", "limit": 1000}'
```

**C) Using `indicator()` instead of `strategy()`:**
```pinescript
//@version=5
strategy("Test")  # NOT indicator("Test")
```

---

### Issue 10: Frontend Shows Blank Page

**Symptoms:**
- http://localhost:3000 loads but shows nothing

**Solutions:**

**A) Check browser console (F12):**
```
Look for JavaScript errors
```

**B) Check Vite output:**
```bash
# Look for compilation errors in terminal
npm run dev
```

**C) Clear cache and reload:**
```
Ctrl+Shift+R (hard reload)
```

---

## 🔍 Diagnostic Commands

### Check All Services
```bash
# Backend health
curl http://localhost:8000/api/health

# Frontend accessibility
curl -I http://localhost:3000

# Pine Script API
curl http://localhost:8000/api/pinescript/examples
```

### Full System Test
```bash
# Run integration test
source venv/bin/activate
python test_pinescript_integration.py
```

### Check Logs
```bash
# Backend logs - check terminal where uvicorn is running
# Frontend logs - check terminal where npm run dev is running
# Browser console - Press F12 in browser
```

---

## 🚨 Emergency Reset

If everything is broken:

```bash
cd /home/dev/projects/electron-app/marketforge-pro-dev-testing

# 1. Kill all processes
pkill -f uvicorn
pkill -f vite

# 2. Clean install
rm -rf node_modules
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt
npm install

# 3. Restart everything
# Terminal 1:
source venv/bin/activate
uvicorn backend.api.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2:
npm run dev

# 4. Access
# http://localhost:3000
```

---

## 📞 Getting Help

### Quick Health Check
```bash
# Copy and run this:
echo "=== HEALTH CHECK ===" && \
curl -s http://localhost:8000/api/health | python3 -m json.tool && \
echo "\n=== FRONTEND ===" && \
curl -I http://localhost:3000 2>&1 | grep "HTTP" && \
echo "\n=== PINE SCRIPT ===" && \
curl -s http://localhost:8000/api/pinescript/examples | python3 -c "import sys, json; print(f'{len(json.load(sys.stdin)[\"examples\"])} examples')"
```

### Debug Mode
```bash
# Backend with debug logging
uvicorn backend.api.main:app --log-level debug --reload

# Frontend with verbose output
npm run dev -- --debug
```

---

## ✅ Verification Checklist

After fixing issues, verify:

- [ ] Backend responds: `curl http://localhost:8000/api/health`
- [ ] Frontend loads: Open http://localhost:3000
- [ ] Pine Script API works: Check examples in editor
- [ ] Translation works: Click "Translate to Python"
- [ ] Execution works: Click "Execute Strategy"
- [ ] Chart displays: See candlesticks and indicators
- [ ] No console errors: Check browser F12

---

## 📚 Additional Resources

- [Main Documentation](PINESCRIPT_INTEGRATION.md)
- [Quick Start](QUICKSTART_PINESCRIPT.md)
- [Status Check](STATUS.md)
- [Integration Summary](INTEGRATION_SUMMARY.md)

---

*Last Updated: October 6, 2025*
