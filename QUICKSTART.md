# MarketForge-Pro Quick Start Guide

Get up and running with MarketForge-Pro in **5 minutes**.

---

## Prerequisites

- **Node.js 18+**: https://nodejs.org/
- **Python 3.10+**: https://python.org/
- **Git**: https://git-scm.com/

---

## Installation (Option 1: Automated)

```bash
# Run setup script
bash scripts/setup.sh

# Follow prompts to configure
# - Install dependencies ✅
# - Setup TradingView submodule ✅
# - (Optional) Setup Resonance.ai submodule
# - Create .env from template ✅
```

---

## Installation (Option 2: Manual)

```bash
# 1. Install dependencies
npm install
cd backend && pip install -r requirements.txt && cd ..

# 2. Setup TradingView charts (Git submodule)
git submodule add https://github.com/tradingview/lightweight-charts.git \
    frontend/src/tradingview/lightweight-charts
git submodule update --init --recursive

# 3. (Optional) Setup Resonance.ai Scanner
git submodule add https://github.com/resonance-ai/scanner-v13.git \
    backend/resonance
cd backend/resonance && pip install -r requirements.txt && cd ../..

# 4. Configure environment
cp .env.example .env
# Edit .env if you want to enable brokers (see Configuration section)
```

---

## Running the Application

### Start All Services

**Terminal 1 - Backend (FastAPI)**:
```bash
npm run start:backend
# Or: cd backend && uvicorn api.main:app --reload --port 8000

# ✅ Backend running on http://localhost:8000
# ✅ API docs at http://localhost:8000/docs
```

**Terminal 2 - Frontend (Vite + React)**:
```bash
npm run start:frontend
# Or: vite --port 3000

# ✅ Frontend running on http://localhost:3000
```

**Terminal 3 - Resonance.ai Scanner (Optional)**:
```bash
cd backend/resonance
python serve_detections.py --port 8001

# ✅ Resonance Scanner on http://localhost:8001
```

### Access the Application

Open your browser: **http://localhost:3000**

You should see:
- TradingView candlestick chart with BTC/USD data
- Timeframe controls (1m, 5m, 1h, 1d, etc.)
- Data source dropdown (CoinGecko by default)
- (Optional) Resonance.ai alert markers on chart

---

## Configuration

### Basic Setup (No API Keys Required)

The application works **out-of-the-box** with:
- **Data Source**: CoinGecko (free, no key needed)
- **Charting**: TradingView lightweight-charts
- **Brokers**: Disabled (can enable later)

**Default `.env`**:
```ini
ENABLE_BROKERS=false        # Brokers disabled
ENABLE_RESONANCE=true       # Resonance enabled
```

### Enable Broker APIs (Kraken, Coinbase, etc.)

1. **Get API keys** from your exchange:
   - Kraken: https://www.kraken.com/u/security/api
   - Coinbase: https://www.coinbase.com/settings/api
   - Binance: https://www.binance.com/en/my/settings/api-management
   - Gemini: https://exchange.gemini.com/settings/api

2. **Edit `.env`**:
   ```ini
   ENABLE_BROKERS=true

   KRAKEN_API_KEY=your_kraken_key_here
   KRAKEN_API_SECRET=your_kraken_secret_here

   COINBASE_API_KEY=your_coinbase_key
   COINBASE_API_SECRET=your_coinbase_secret
   ```

3. **Restart backend**:
   ```bash
   # Press Ctrl+C in Terminal 1, then:
   npm run start:backend
   ```

4. **Switch data source** in UI:
   - Select "Kraken" from dropdown
   - Chart will now fetch live data from Kraken API

### Disable Resonance.ai Alerts

If you don't want to run the Resonance Scanner:

**Edit `.env`**:
```ini
ENABLE_RESONANCE=false
```

Restart backend → Alerts won't be fetched.

---

## Testing

### Backend Tests (Pytest)

```bash
cd backend
pytest tests/ -v

# Expected output:
# ✅ 25 tests passed
# ✅ Coverage: 87%
```

### Frontend Tests (Jest)

```bash
npm test

# Expected output:
# ✅ 12 tests passed
# ✅ Coverage: 82%
```

### Validate Resonance.ai Schema

```bash
python scripts/test_schema.py

# Expected output:
# ✅ Health check passed
# ✅ Schema validation passed
```

---

## Troubleshooting

### Chart Not Rendering

**Problem**: Blank screen, no chart visible

**Solution**:
1. Check browser console (F12) for errors
2. Verify backend is running: `curl http://localhost:8000/api/health`
3. Check data format in Network tab (time should be in seconds, not ms)

### Broker Endpoints Return 403

**Problem**: `GET /api/broker/kraken/ohlcv/BTC/USD` → 403 Forbidden

**Solution**:
1. Set `ENABLE_BROKERS=true` in `.env`
2. Add API keys for desired exchange
3. Restart backend

### Resonance Alerts Not Showing

**Problem**: No markers on chart, Resonance enabled

**Solution**:
1. Check Resonance service: `curl http://localhost:8001/health`
2. If not running: `cd backend/resonance && python serve_detections.py --port 8001`
3. Verify `ENABLE_RESONANCE=true` in `.env`

### Import Error: `ModuleNotFoundError: No module named 'ccxt'`

**Problem**: Backend crashes on startup

**Solution**:
```bash
cd backend
pip install ccxt
# Or set ENABLE_BROKERS=false in .env
```

---

## Next Steps

### Learn More

- **README.md**: Full feature overview
- **docs/INTEGRATION_GUIDE.md**: TradingView & Resonance integration
- **docs/ARCHITECTURE.md**: System architecture & data flow

### Customize

1. **Add New Indicators**:
   - Create `backend/indicators/my_indicator.py`
   - Integrate in `chart_data.py`
   - Render as line series in frontend

2. **Add New Broker**:
   - Check ccxt support: https://docs.ccxt.com/#exchanges
   - Add credentials to `.env`
   - Update `broker_endpoints.py::_initialize_exchanges()`

3. **Modify Chart Styling**:
   - Edit `TradingChart.tsx` chart options
   - See TradingView docs: https://tradingview.github.io/lightweight-charts/

---

## Development Workflow

### Watch Mode (Auto-Reload)

Both frontend and backend auto-reload on file changes:

```bash
# Terminal 1: Backend with auto-reload
npm run start:backend

# Terminal 2: Frontend with HMR (Hot Module Replacement)
npm run start:frontend
```

Edit code → Save → Changes appear instantly!

### Git Workflow

```bash
# Check submodule status
git submodule status

# Update TradingView to latest
git submodule update --remote frontend/src/tradingview/lightweight-charts

# Update Resonance to latest
git submodule update --remote backend/resonance
python scripts/test_schema.py  # Validate compatibility

# Commit changes
git add .
git commit -m "feat: add new indicator"
git push
```

---

## Production Deployment (Docker)

```bash
# Build and run with Docker Compose
docker-compose up -d

# Services:
# - Backend: http://localhost:8000
# - Frontend: http://localhost:80
# - Resonance: http://localhost:8001

# Stop services
docker-compose down
```

---

## Support & Resources

- **Issues**: GitHub Issues (your-repo/issues)
- **TradingView Docs**: https://tradingview.github.io/lightweight-charts/
- **ccxt Docs**: https://docs.ccxt.com/
- **FastAPI Docs**: https://fastapi.tiangolo.com/

---

## Quick Reference

### Useful Commands

```bash
# Install all dependencies
npm run install:all

# Start backend
npm run start:backend

# Start frontend
npm run start:frontend

# Run all tests
npm run test:backend && npm test

# Validate Resonance schema
python scripts/test_schema.py

# Build for production
npm run build
```

### Important Files

- `.env`: Configuration & API keys
- `backend/api/main.py`: Backend entry point
- `frontend/src/App.tsx`: Frontend entry point
- `frontend/src/components/TradingChart.tsx`: Chart component

### Default Ports

- **Frontend**: 3000
- **Backend**: 8000
- **Resonance**: 8001

---

## Success Checklist

After setup, you should see:

- ✅ Backend running on port 8000
- ✅ Frontend accessible at http://localhost:3000
- ✅ TradingView chart rendering BTC/USD candles
- ✅ Timeframe controls working (switch 1h → 1d)
- ✅ No errors in browser console
- ✅ API health check: `curl localhost:8000/api/health` → "healthy"

**Congratulations! MarketForge-Pro is ready to use.** 🎉

---

**Last Updated**: 2025-10-05
**Version**: 1.0.0
