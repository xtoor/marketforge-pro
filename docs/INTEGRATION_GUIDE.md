# TradingView & Resonance.ai Integration Guide

## Overview

This document details how MarketForge-Pro integrates external libraries and services while maintaining modularity and backward compatibility.

---

## TradingView Lightweight Charts Integration

### Source Repository
- **Repo**: https://github.com/tradingview/lightweight-charts
- **License**: Apache 2.0
- **Integration Method**: Git submodule + npm package

### Setup

```bash
# Method 1: Git Submodule (for custom builds)
git submodule add https://github.com/tradingview/lightweight-charts.git \
  frontend/src/tradingview/lightweight-charts
git submodule update --init --recursive

# Method 2: npm package (recommended for most users)
npm install lightweight-charts
```

### Usage in Frontend

**Component**: `frontend/src/components/TradingChart.tsx`

```typescript
import { createChart, IChartApi } from 'lightweight-charts';

// Initialize chart
const chart = createChart(container, {
  width: 800,
  height: 600,
  layout: { background: { color: '#1e222d' } }
});

// Add candlestick series
const candlestickSeries = chart.addCandlestickSeries();

// Set data (from backend API)
candlestickSeries.setData([
  { time: 1609459200, open: 29000, high: 29500, low: 28800, close: 29200 }
]);
```

### Data Flow

```
Backend API (/api/chart/data)
  ↓
useChartData Hook (React Query)
  ↓
TradingChart Component
  ↓
lightweight-charts createChart()
  ↓
Rendered Canvas (high-fidelity candlesticks)
```

### Fidelity Preservation

**Goal**: <1% pixel difference from TradingView demos

**Approach**:
1. Use default TradingView color schemes
2. Minimal custom styling
3. Preserve native zoom/pan behavior
4. A/B testing with screenshots (see `scripts/test_fidelity.py`)

**Verify**:
```bash
npm run test:fidelity
# Compares rendered chart to TradingView demo baseline
```

---

## Broker API Integration (ccxt)

### Supported Brokers
- **Kraken**: Full support (OHLCV, ticker, orderbook)
- **Coinbase**: Full support
- **Binance**: Full support
- **Gemini**: Full support

### Optional Architecture

Brokers are **opt-in** via `.env` toggle:

```ini
ENABLE_BROKERS=false  # Default: disabled
```

**When disabled**:
- `broker_endpoints.py` routes are NOT registered
- No ccxt dependency loaded
- Fallback to CoinGecko API

**When enabled**:
- Set `ENABLE_BROKERS=true`
- Add API keys to `.env`
- Restart backend → routes auto-register

### Implementation Details

**File**: `backend/api/broker_endpoints.py`

```python
# Conditional import
try:
    import ccxt.async_support as ccxt_async
    CCXT_AVAILABLE = True
except ImportError:
    CCXT_AVAILABLE = False

# Router only included if enabled
if settings.ENABLE_BROKERS:
    app.include_router(broker_router, prefix="/api/broker")
```

### Adding New Brokers

1. **Check ccxt support**: https://docs.ccxt.com/en/latest/manual.html#exchanges
2. **Add credentials** to `backend/api/config.py`:
   ```python
   NEWBROKER_API_KEY: Optional[str] = None
   NEWBROKER_API_SECRET: Optional[str] = None
   ```
3. **Initialize in BrokerManager** (`broker_endpoints.py`):
   ```python
   if settings.NEWBROKER_API_KEY:
       self.exchanges['newbroker'] = ccxt_async.newbroker({
           'apiKey': settings.NEWBROKER_API_KEY,
           'secret': settings.NEWBROKER_API_SECRET,
           'enableRateLimit': True
       })
   ```
4. **Test**: `curl localhost:8000/api/broker/newbroker/ohlcv/BTC/USD`

---

## Resonance.ai Scanner v13 Integration

### Architecture: Git Submodule

**Why submodule?**
- **Modularity**: Separate repo, independent updates
- **Schema Isolation**: Fixed v13 contract prevents breaking changes
- **Optional**: Can disable via `ENABLE_RESONANCE=false`

### Setup

```bash
# Add submodule
git submodule add https://github.com/resonance-ai/scanner-v13.git backend/resonance
git submodule update --init

# Install scanner dependencies
cd backend/resonance
pip install -r requirements.txt

# Start scanner service
python serve_detections.py --port 8001
```

### Fixed Schema (v13)

**Contract**: `backend/bridges/resonance_bridge.py::ResonanceAlert`

```python
class ResonanceAlert(BaseModel):
    time: int           # Unix timestamp (seconds)
    symbol: str         # "BTC/USD"
    signal: str         # "breakout" | "breakdown" | "support" | "resistance"
    confidence: float   # 0.0 - 1.0
    price: Optional[float]
    volume: Optional[float]
```

**Breaking Change Detection**:
```python
try:
    alerts = [ResonanceAlert(**alert) for alert in response['alerts']]
except ValidationError as e:
    raise RuntimeError(
        f"Resonance.ai schema changed! Expected v13 format. "
        f"Run 'git submodule update' and check for breaking changes."
    )
```

### Updating Submodule

```bash
# Check for updates
cd backend/resonance
git fetch origin
git log --oneline HEAD..origin/main  # Review changes

# Update to latest
git pull origin main
cd ../..
git add backend/resonance
git commit -m "chore: update Resonance.ai to v13.x"

# Validate schema compatibility
pytest backend/tests/test_resonance_bridge.py::test_get_alerts_schema_mismatch
```

### HTTP API Endpoints

**Base URL**: `http://localhost:8001` (configurable via `RESONANCE_PORT`)

```http
GET /health
Response: {"status": "healthy", "version": "v13"}

GET /alerts?symbol=BTC/USD&limit=100&since=1609459200
Response:
{
  "alerts": [
    {
      "time": 1609459200,
      "symbol": "BTC/USD",
      "signal": "breakout",
      "confidence": 0.95,
      "price": 29500
    }
  ]
}

GET /status
Response: {"scanner_state": "active", "symbols_tracked": 150}
```

### Data Flow to Frontend

```
Resonance Scanner (serve_detections.py on :8001)
  ↓ HTTP GET /alerts
ResonanceBridge.get_alerts()
  ↓ Schema validation (ResonanceAlert model)
chart_data.py::_format_resonance_markers()
  ↓ Convert to TradingView marker format
TradingChart.tsx
  ↓ candlestickSeries.setMarkers()
Visual Markers on Chart (arrows, circles)
```

### Marker Format Conversion

**Resonance Alert**:
```json
{
  "time": 1609459200,
  "signal": "breakout",
  "confidence": 0.95
}
```

**TradingView Marker**:
```json
{
  "time": 1609459200,
  "position": "belowBar",
  "color": "#00ff00",
  "shape": "arrowUp",
  "text": "Breakout (95%)"
}
```

**Conversion Logic**: `backend/api/chart_data.py::_format_resonance_markers()`

---

## Modular Integration Best Practices

### 1. Feature Toggles

All integrations respect `.env` toggles:

```python
# backend/api/main.py
if settings.ENABLE_BROKERS:
    app.include_router(broker_router)

if settings.ENABLE_RESONANCE:
    app.state.resonance = ResonanceBridge()
```

### 2. Fallback Sources

If optional service unavailable, gracefully degrade:

```python
# chart_data.py
try:
    response = await get_ohlcv(exchange='kraken', ...)
except Exception:
    # Fallback to CoinGecko
    candles = await _fetch_coingecko_data(...)
```

### 3. Schema Contracts

All external APIs use Pydantic models:

```python
class OHLCVCandle(BaseModel):
    time: float
    open: float
    high: float
    low: float
    close: float
    volume: float
```

Prevents runtime errors from malformed data.

### 4. Submodule Hygiene

```bash
# Check submodule status
git submodule status

# Update all submodules
git submodule update --remote

# Freeze submodule to specific commit (recommended)
cd backend/resonance
git checkout v13.2.1  # Specific tag
cd ../..
git add backend/resonance
git commit -m "fix: pin Resonance to v13.2.1"
```

---

## Testing Integrations

### TradingView Fidelity Test

```python
# scripts/test_fidelity.py
from playwright.sync_api import sync_playwright

# Render MarketForge-Pro chart
screenshot1 = page.screenshot()

# Render official TradingView demo
screenshot2 = demo_page.screenshot()

# Compare pixels
diff = compare_images(screenshot1, screenshot2)
assert diff < 0.01  # <1% difference
```

### Resonance Schema Test

```python
# backend/tests/test_resonance_bridge.py
async def test_schema_mismatch():
    mock_response = {
        "alerts": [
            {"timestamp": 123, "ticker": "BTC"}  # Wrong schema!
        ]
    }

    with pytest.raises(RuntimeError, match="schema changed"):
        await bridge.get_alerts()
```

### Broker Integration Test

```python
@patch('ccxt_async.kraken')
def test_kraken_ohlcv(mock_kraken):
    mock_kraken.fetch_ohlcv.return_value = [...]

    response = client.get("/api/broker/kraken/ohlcv/BTC/USD")

    assert response.status_code == 200
    assert response.json()['source'] == 'kraken'
```

---

## Performance Targets

| Metric | Target | Test Command |
|--------|--------|--------------|
| Chart Redraw (5000 candles) | <100ms | `npm run benchmark:chart` |
| API Response (OHLCV) | <200ms | `scripts/benchmark_api.py` |
| Memory Usage (4 cores) | <500MB | `pytest --memray` |
| Visual Fidelity | <1% pixel diff | `npm run test:fidelity` |

---

## Troubleshooting

### TradingView Chart Not Rendering

1. **Check lightweight-charts import**:
   ```typescript
   import { createChart } from 'lightweight-charts';
   // NOT from submodule directly
   ```

2. **Verify data format**:
   ```javascript
   // Time must be in SECONDS, not milliseconds
   { time: 1609459200, open: 29000, ... }  // ✅
   { time: 1609459200000, open: 29000, ... }  // ❌
   ```

3. **Container size**:
   ```typescript
   const chart = createChart(container, {
     width: container.clientWidth,  // Must be > 0
     height: 600
   });
   ```

### Resonance Alerts Not Appearing

1. **Check service status**:
   ```bash
   curl http://localhost:8001/health
   ```

2. **Verify schema**:
   ```bash
   curl http://localhost:8001/alerts | jq
   # Should match ResonanceAlert fields
   ```

3. **Enable in .env**:
   ```ini
   ENABLE_RESONANCE=true
   ```

### Broker Endpoints 403 Error

1. **Enable in .env**:
   ```ini
   ENABLE_BROKERS=true
   ```

2. **Add API keys** for desired exchange

3. **Restart backend**:
   ```bash
   npm run start:backend
   ```

---

## Additional Resources

- **TradingView Docs**: https://tradingview.github.io/lightweight-charts/
- **ccxt Manual**: https://docs.ccxt.com/
- **Pydantic Validation**: https://docs.pydantic.dev/
- **Git Submodules**: https://git-scm.com/book/en/v2/Git-Tools-Submodules

---

**Last Updated**: 2025-10-05
**MarketForge-Pro Version**: 1.0.0
