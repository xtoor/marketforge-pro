# MarketForge-Pro Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React + Vite)                  │
│  ┌──────────────────┐  ┌─────────────────┐  ┌────────────────┐ │
│  │  TradingChart    │  │  ChartControls  │  │  useChartData  │ │
│  │  (lightweight-   │  │  (timeframe/    │  │  (React Query) │ │
│  │   charts)        │  │   source)       │  │                │ │
│  └──────────────────┘  └─────────────────┘  └────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↓ HTTP GET /api/chart/data
┌─────────────────────────────────────────────────────────────────┐
│                        Backend (FastAPI)                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   API Layer (main.py)                    │   │
│  │  • CORS middleware                                       │   │
│  │  • Conditional router registration (brokers, chart)      │   │
│  │  • Lifespan management (Resonance bridge init)           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              ↓                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                 Chart Data Aggregator                    │   │
│  │  • Fetch OHLCV (broker or CoinGecko fallback)            │   │
│  │  • Fetch Resonance alerts (if enabled)                   │   │
│  │  • Fetch ML predictions (if enabled)                     │   │
│  │  • Merge & format for TradingView                        │   │
│  └──────────────────────────────────────────────────────────┘   │
│           ↓                     ↓                    ↓          │
│  ┌───────────────┐  ┌──────────────────┐  ┌─────────────────┐  │
│  │ Broker Mgr    │  │ Resonance Bridge │  │ TradingView Br  │  │
│  │ (ccxt)        │  │ (HTTP client)    │  │ (formatters)    │  │
│  └───────────────┘  └──────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
         ↓                      ↓                        ↓
┌───────────────────┐  ┌────────────────────┐  ┌──────────────────┐
│ Exchange APIs     │  │ Resonance Scanner  │  │ CoinGecko API    │
│ (Kraken, etc.)    │  │ (Git Submodule)    │  │ (Fallback)       │
│ via ccxt library  │  │ serve_detections.py│  │                  │
└───────────────────┘  └────────────────────┘  └──────────────────┘
```

---

## Component Details

### Frontend

#### TradingChart Component
**File**: `frontend/src/components/TradingChart.tsx`

**Responsibilities**:
- Initialize TradingView lightweight-charts canvas
- Fetch data via `useChartData` hook
- Render candlestick series + markers (alerts)
- Handle zoom/pan interactions

**Key APIs**:
```typescript
const chart = createChart(container, options);
const candlestickSeries = chart.addCandlestickSeries();
candlestickSeries.setData(candles);
candlestickSeries.setMarkers(resonanceAlerts);
```

#### useChartData Hook
**File**: `frontend/src/hooks/useChartData.ts`

**Responsibilities**:
- React Query wrapper for `/api/chart/data` endpoint
- Caching (30s stale time, 60s refetch interval)
- Automatic retries with exponential backoff

**Return Data**:
```typescript
{
  candles: OHLCVCandle[],
  markers: ChartMarker[] | null,
  indicators: any | null,
  source: string
}
```

---

### Backend

#### API Layer (`backend/api/main.py`)

**Lifespan Management**:
```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize Resonance bridge
    if settings.ENABLE_RESONANCE:
        app.state.resonance = ResonanceBridge()
        await app.state.resonance.connect()

    yield

    # Shutdown: Close connections
    await app.state.resonance.disconnect()
```

**Conditional Routing**:
```python
if settings.ENABLE_BROKERS:
    app.include_router(broker_router, prefix="/api/broker")
# If disabled, routes don't exist (404)
```

#### Chart Data Aggregator (`backend/api/chart_data.py`)

**Workflow**:
1. **Fetch OHLCV**:
   - If `source != "coingecko"` AND brokers enabled → Use broker endpoint
   - Else → Fallback to `_fetch_coingecko_data()`

2. **Fetch Alerts** (if `include_alerts=true`):
   - Call `ResonanceBridge.get_alerts(symbol)`
   - Convert to TradingView markers via `_format_resonance_markers()`

3. **Fetch ML Predictions** (if `include_ml=true`):
   - Call `strategy_engine.predict()` (TODO)

4. **Merge & Return**:
   ```python
   return ChartDataResponse(
       candles=[...],
       markers=[...],
       indicators={...},
       source="kraken"
   )
   ```

#### Broker Manager (`backend/api/broker_endpoints.py`)

**Exchange Initialization**:
```python
def _initialize_exchanges(self):
    if settings.KRAKEN_API_KEY:
        self.exchanges['kraken'] = ccxt_async.kraken({
            'apiKey': settings.KRAKEN_API_KEY,
            'secret': settings.KRAKEN_API_SECRET,
            'enableRateLimit': True
        })
```

**Unified OHLCV Fetch**:
```python
async def get_ohlcv(exchange, symbol, timeframe, limit):
    exchange_instance = broker_manager.get_exchange(exchange)
    ohlcv = await exchange_instance.fetch_ohlcv(symbol, timeframe, limit)

    # Transform to TradingView format
    return [
        {"time": candle[0]/1000, "open": candle[1], ...}
        for candle in ohlcv
    ]
```

#### Resonance Bridge (`backend/bridges/resonance_bridge.py`)

**Schema Validation**:
```python
class ResonanceAlert(BaseModel):
    time: int
    symbol: str
    signal: str  # Fixed enum in v13
    confidence: float

async def get_alerts(self, symbol):
    response = await self.session.get(f"{base_url}/alerts")
    data = await response.json()

    # Raises ValidationError if schema mismatch
    alerts = [ResonanceAlert(**a) for a in data['alerts']]
    return alerts
```

**Caching**:
- In-memory dict: `{cache_key: [alerts]}`
- TTL: 60 seconds
- Reduces HTTP calls to Resonance scanner

---

## Data Flow Examples

### Example 1: Basic Chart Load

```
User opens page
  ↓
TradingChart renders
  ↓
useChartData() triggers GET /api/chart/data/BTC/USD?timeframe=1h&source=coingecko
  ↓
chart_data.py::get_chart_data()
  ↓
_fetch_coingecko_data() → CoinGecko API
  ↓
Transform to OHLCVCandle[] + TradingView format
  ↓
Return ChartDataResponse
  ↓
TradingChart receives data
  ↓
candlestickSeries.setData(candles)
  ↓
Chart renders on canvas
```

### Example 2: Chart with Resonance Alerts

```
User toggles "Resonance Alerts" ON
  ↓
GET /api/chart/data/BTC/USD?include_alerts=true
  ↓
chart_data.py::get_chart_data()
  ↓
Parallel fetch:
  1. _fetch_coingecko_data() → candles
  2. ResonanceBridge.get_alerts(symbol="BTC/USD")
     ↓
     GET http://localhost:8001/alerts?symbol=BTC/USD
     ↓
     Schema validation (ResonanceAlert model)
     ↓
     Return [alerts]
  ↓
_format_resonance_markers(alerts, candles)
  ↓
Return ChartDataResponse(candles=[...], markers=[...])
  ↓
TradingChart:
  candlestickSeries.setData(candles)
  candlestickSeries.setMarkers(markers)  # Visual arrows
```

### Example 3: Broker Source Switch

```
User switches source: "CoinGecko" → "Kraken"
  ↓
ChartControls.onSourceChange("kraken")
  ↓
useChartData re-fetches with new params
  ↓
GET /api/chart/data/BTC/USD?source=kraken
  ↓
chart_data.py checks: settings.ENABLE_BROKERS == true?
  ↓
Yes → Call broker_endpoints.get_ohlcv(exchange="kraken", ...)
  ↓
BrokerManager.get_exchange("kraken")
  ↓
ccxt_async.kraken().fetch_ohlcv("BTC/USD", "1h", 500)
  ↓
Kraken API response
  ↓
Transform to TradingView format
  ↓
Return ChartDataResponse(source="kraken", candles=[...])
  ↓
Chart re-renders with Kraken data (no visual difference!)
```

---

## Configuration Management

### Environment Variables (`.env`)

**Loaded by**: `backend/api/config.py` (Pydantic Settings)

**Precedence**:
1. Environment variables (highest)
2. `.env` file
3. Default values in `Settings` class

**Example**:
```python
class Settings(BaseSettings):
    ENABLE_BROKERS: bool = False  # Default
    KRAKEN_API_KEY: Optional[str] = None

    class Config:
        env_file = ".env"

settings = Settings()  # Auto-loads .env
```

### Feature Toggles

| Toggle | Default | Effect |
|--------|---------|--------|
| `ENABLE_BROKERS` | `false` | Registers broker endpoints if `true` |
| `ENABLE_RESONANCE` | `true` | Initializes Resonance bridge if `true` |
| `ENABLE_ML_STRATEGIES` | `false` | Enables ML predictions in chart data |

---

## Security & Error Handling

### API Key Protection
- Stored in `.env` (gitignored)
- Loaded via Pydantic Settings (not hardcoded)
- Never exposed in frontend

### Schema Validation
- All external APIs → Pydantic models
- Invalid data → `ValidationError` → 500 response
- Prevents silent data corruption

### Graceful Degradation
```python
try:
    alerts = await resonance.get_alerts()
except Exception as e:
    # Non-blocking: continue without alerts
    print(f"Resonance unavailable: {e}")
    alerts = None
```

### Rate Limiting
- ccxt: `enableRateLimit: True` (auto-throttles)
- Resonance: Caching (60s TTL)
- CoinGecko: 50 calls/min (free tier)

---

## Performance Optimizations

### Frontend
- **React Query caching**: 30s stale time, 60s refetch
- **Component memoization**: `React.memo(TradingChart)`
- **Lazy loading**: Code splitting for chart components

### Backend
- **Async I/O**: All API calls use `aiohttp`/`asyncio`
- **Connection pooling**: ccxt maintains exchange connections
- **Caching**: Resonance alerts cached in-memory

### Benchmarks
- Chart redraw (5000 candles): **<100ms** (target)
- API response (OHLCV): **<200ms** (target)
- Memory usage: **<500MB** on 4 cores

---

## Deployment Architecture

### Development
```bash
# Terminal 1: Backend
uvicorn backend.api.main:app --reload --port 8000

# Terminal 2: Frontend
vite --port 3000

# Terminal 3: Resonance (optional)
python backend/resonance/serve_detections.py --port 8001
```

### Production (Docker)
```dockerfile
# backend/Dockerfile
FROM python:3.10
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]

# frontend/Dockerfile
FROM node:18
WORKDIR /app
COPY package*.json .
RUN npm ci
COPY . .
RUN npm run build
CMD ["npx", "vite", "preview", "--host", "0.0.0.0", "--port", "3000"]
```

**docker-compose.yml**:
```yaml
services:
  backend:
    build: ./backend
    ports: ["8000:8000"]
    env_file: .env

  frontend:
    build: ./frontend
    ports: ["3000:3000"]
    depends_on: [backend]

  resonance:
    build: ./backend/resonance
    ports: ["8001:8001"]
```

---

## Testing Strategy

### Unit Tests (Backend)
- **Pytest** for all modules
- **Mock** external APIs (ccxt, Resonance, CoinGecko)
- **Coverage**: 80%+ target

### Integration Tests
- **TestClient** (FastAPI) for endpoint testing
- Real submodule calls (Resonance)
- Database migrations (if applicable)

### Frontend Tests
- **Jest** + **React Testing Library**
- Mock API responses (MSW)
- Snapshot tests for UI components

### E2E Tests (Playwright)
- Full user flows (load chart, switch source, view alerts)
- Visual regression (screenshot diffs)

---

## Extensibility

### Adding New Indicators

1. **Create Python module**: `backend/indicators/my_indicator.py`
   ```python
   def calculate_sma(candles, period=20):
       return [{"time": c.time, "value": sma(c.close)} for c in candles]
   ```

2. **Integrate in chart_data.py**:
   ```python
   if include_indicators:
       from ..indicators.my_indicator import calculate_sma
       indicators['sma'] = calculate_sma(candles)
   ```

3. **Render in frontend**:
   ```typescript
   const lineSeries = chart.addLineSeries();
   lineSeries.setData(data.indicators.sma);
   ```

### Adding New Data Sources

1. **Create bridge**: `backend/bridges/newsource_bridge.py`
2. **Add endpoint**: `backend/api/newsource_endpoints.py`
3. **Update chart_data.py fallback logic**
4. **Add to ChartControls source dropdown**

---

**Last Updated**: 2025-10-05
**Version**: 1.0.0
