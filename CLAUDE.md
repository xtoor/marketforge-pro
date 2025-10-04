# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MarketForge-Pro is a free, open-source TradingView alternative with Python-based strategy development. It combines a React/TypeScript frontend with an Express.js backend, PostgreSQL database, and Python technical analysis engine.

## Development Commands

### Start Development Server
```bash
npm run dev
```
Runs the Express.js backend with Vite HMR for frontend development on port 5000.

### Build for Production
```bash
npm run build
```
Builds client bundle to `dist/public/` and server bundle to `dist/` using Vite and esbuild.

### Start Production Server
```bash
npm start
```
Runs the built application from `dist/index.js`.

### Database Operations
```bash
npm run db:push          # Push schema changes to PostgreSQL
```

### Type Checking
```bash
npm run check            # Run TypeScript compiler without emitting
```

### Python Environment
```bash
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt  # if requirements.txt exists
```
Python dependencies are managed via `pyproject.toml` using uv package manager (numpy, pandas, requests).

## Architecture

### Three-Tier Stack

**Frontend** (`client/src/`):
- React 18 + TypeScript with Vite
- Routing: Wouter (`pages/trading-dashboard.tsx`, `pages/strategy-editor.tsx`)
- State: Zustand stores (`stores/tradingStore.ts`, `stores/drawingStore.ts`, `stores/indicatorStore.ts`)
- Data fetching: TanStack Query (React Query)
- UI: shadcn/ui components (Radix UI + Tailwind CSS)
- Charts: lightweight-charts v5.0.8 for candlestick rendering

**Backend** (`server/`):
- Express.js TypeScript server (`server/index.ts`)
- RESTful API routes in `server/routes.ts`
- Real-time: WebSocket server for market data streaming
- Python integration: Node spawns Python processes for strategy execution
- Market data: `server/marketDataService.ts` handles CoinGecko API integration

**Database** (`shared/schema.ts`):
- PostgreSQL with Drizzle ORM
- Tables: users, symbols, market_data, watchlists, orders, positions, alerts, strategies, backtests, drawings
- Migrations in `migrations/` directory

### Key Integrations

**Python Backend** (`python/`):
- `indicators.py`: 13+ technical indicators (SMA, EMA, RSI, MACD, Bollinger Bands, etc.)
- `indicator_calculator.py`: JSON API wrapper for Node.js communication
- `strategy_engine.py`: Safe execution environment for user strategies
- `backtester.py`: Historical performance analysis

**External APIs**:
- CoinGecko API for real-time crypto OHLCV data (handled by `marketDataService`)
- Rate limiting and automatic retries built-in

## File Structure

```
marketforge-pro/
├── client/               # React frontend
│   └── src/
│       ├── components/   # UI components (trading/, ui/)
│       ├── pages/        # Route pages
│       ├── stores/       # Zustand state management
│       ├── hooks/        # Custom React hooks
│       └── lib/          # Utilities
├── server/               # Express backend
│   ├── index.ts          # Server entry point
│   ├── routes.ts         # API endpoints
│   ├── storage.ts        # Database operations
│   ├── marketDataService.ts  # Market data fetching
│   └── vite.ts           # Vite dev server integration
├── python/               # Python analysis engine
│   ├── indicators.py
│   ├── indicator_calculator.py
│   ├── strategy_engine.py
│   └── backtester.py
├── shared/               # Shared TypeScript types
│   └── schema.ts         # Drizzle database schema
└── dist/                 # Build output
```

## Important Development Notes

### Database Schema Conventions
- All primary keys use `gen_random_uuid()` for UUID generation
- Foreign keys use proper references with cascading deletes where appropriate
- Indexes on `(symbolId, timeframe, timestamp)` for market data queries
- JSONB columns for flexible data (strategy parameters, drawing points)

### Chart System
- Uses lightweight-charts v5 API (not v4)
- Candlestick data format: `{time: number, open: number, high: number, low: number, close: number}`
- Drawing tools use `createPriceLine()` for horizontal lines and `LineSeries` for trend lines
- All drawings persist to database with symbolId + timeframe filtering

### State Management Pattern
- **Trading state** (symbol, timeframe, chart type): `useTradingStore()` from Zustand
- **Server data** (market data, indicators): TanStack Query hooks (`useQuery`, `useMutation`)
- **Drawing tools**: `useDrawingStore()` for active tool state
- **Indicators**: `useIndicatorStore()` for active indicators list

### Python-Node Integration
- Python scripts output JSON to stdout
- Node.js reads stdout using `child_process.spawn()`
- API endpoint: `/api/indicators/:symbolId/:timeframe/:indicatorType`
- Python receives market data as JSON via stdin, returns calculated indicator values

### API Endpoints Pattern
```
GET  /api/symbols                           # List all trading symbols
GET  /api/market-data/:symbolId/:timeframe  # Get OHLCV candles
GET  /api/indicators/:symbolId/:timeframe/:indicatorType  # Calculate indicator
POST /api/drawings                          # Save chart drawing
GET  /api/drawings/:userId/:symbolId/:timeframe  # Load drawings
DELETE /api/drawings/:id                    # Delete drawing
```

### Component Styling
- Dark theme with glassmorphism: `bg-gray-900/50 backdrop-blur-md`
- Neon accents: cyan (`text-cyan-400`, `border-cyan-500`)
- Financial data colors: green (bullish), red (bearish)
- Fonts: Inter (UI), JetBrains Mono (code/data)

## Testing Changes

1. **Backend changes**: Restart dev server (`Ctrl+C`, then `npm run dev`)
2. **Frontend changes**: Vite HMR auto-reloads (check browser console for errors)
3. **Database schema changes**: Run `npm run db:push` after modifying `shared/schema.ts`
4. **Python changes**: No restart needed, scripts execute on API call
5. **Chart rendering**: Check browser DevTools console for lightweight-charts errors

## Known Issues & Ongoing Work

- Project is in active development (see README.md disclaimer)
- Some features from roadmap not yet implemented (alerts system, portfolio tracking)
- Real-time WebSocket streaming is implemented but not fully integrated in all components
- Testing suite is minimal (20% completion per WORKFLOW.md)

## Development Workflow

When adding new features:
1. Update database schema in `shared/schema.ts` if needed
2. Add API routes in `server/routes.ts`
3. Create/update React components in `client/src/components/`
4. Add Zustand store if new global state needed
5. Use TanStack Query for server state management
6. Document major changes in `WORKFLOW.md`

For technical indicators:
1. Add calculation logic to `python/indicators.py`
2. Update `python/indicator_calculator.py` to handle new type
3. Add API endpoint handler in `server/routes.ts`
4. Create UI component in `client/src/components/trading/`

Path aliases configured in `vite.config.ts`:
- `@/` → `client/src/`
- `@shared/` → `shared/`
- `@assets/` → `attached_assets/`
