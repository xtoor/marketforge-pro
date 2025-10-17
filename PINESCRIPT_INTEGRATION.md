# Pine Script Integration - MarketForge Pro

## Overview

MarketForge Pro now includes **pine2py** integration, allowing users to write, translate, and execute TradingView Pine Script strategies directly within the platform.

## Features

### 1. Pine Script Translation
- Translate Pine Script v5/v6 to executable Python code
- Support for indicators and strategies
- Real-time syntax validation

### 2. Strategy Execution
- Execute translated strategies on historical market data
- Backtest against multiple timeframes and symbols
- View detailed execution results

### 3. Visualization
- Interactive chart with strategy overlays
- Order markers (entry/exit points)
- Indicator plots with custom colors
- Performance metrics display

## Supported Pine Script Features

### Built-in Variables
- `close`, `open`, `high`, `low`, `volume`
- `time`, `bar_index`, `na`

### Technical Indicators
- `ta.sma` - Simple Moving Average
- `ta.ema` - Exponential Moving Average
- `ta.rsi` - Relative Strength Index
- `ta.macd` - MACD (Moving Average Convergence Divergence)
- `ta.crossover` - Crossover detection
- `ta.crossunder` - Crossunder detection

### Strategy Functions
- `strategy.entry` - Enter position
- `strategy.exit` - Exit position with conditions
- `strategy.close` - Close position

### Input Functions
- `input.int` - Integer input
- `input.float` - Float input
- `input.bool` - Boolean input
- `input.string` - String input

### Plotting
- `plot()` - Plot values on chart

## API Endpoints

### POST `/api/pinescript/translate`
Translate Pine Script to Python code

**Request:**
```json
{
  "code": "//@version=5\nindicator(\"SMA\")\nplot(ta.sma(close, 14))"
}
```

**Response:**
```json
{
  "success": true,
  "python_code": "import numpy as np\n..."
}
```

### POST `/api/pinescript/execute`
Execute Pine Script strategy on historical data

**Request:**
```json
{
  "code": "//@version=5\nstrategy(\"SMA Cross\")\n...",
  "symbol": "BTC/USD",
  "timeframe": "1h",
  "limit": 500
}
```

**Response:**
```json
{
  "success": true,
  "orders": [...],
  "positions": [...],
  "indicators": {...}
}
```

### POST `/api/pinescript/validate`
Validate Pine Script syntax

**Request:**
```json
{
  "code": "//@version=5\nindicator(\"Test\")\n..."
}
```

**Response:**
```json
{
  "valid": true,
  "message": "Pine Script is valid"
}
```

### GET `/api/pinescript/examples`
Get example Pine Script strategies

**Response:**
```json
{
  "examples": [
    {
      "name": "SMA Indicator",
      "type": "indicator",
      "code": "..."
    }
  ]
}
```

### GET `/api/pinescript/supported-functions`
List all supported Pine Script functions

## Frontend Usage

### Enable Pine Script Editor

1. Open MarketForge Pro
2. Check the "Pine Script Editor" checkbox in the controls panel
3. The Pine Script editor will appear below

### Basic Workflow

1. **Select Example** (optional): Choose from pre-built examples
2. **Configure**: Set symbol and timeframe
3. **Write Code**: Enter your Pine Script strategy
4. **Translate**: Click "Translate to Python" to see the generated code
5. **Execute**: Click "Execute Strategy" to run backtest
6. **Analyze**: View results on interactive chart with markers and indicators

### Example Pine Script

```pinescript
//@version=5
strategy(title="SMA Crossover", overlay=true)

// Inputs
fast_length = input.int(9, title="Fast SMA")
slow_length = input.int(21, title="Slow SMA")

// Calculate SMAs
sma_fast = ta.sma(close, fast_length)
sma_slow = ta.sma(close, slow_length)

// Detect crossovers
crossover = ta.crossover(sma_fast, sma_slow)
crossunder = ta.crossunder(sma_fast, sma_slow)

// Strategy logic
if crossover
    strategy.entry("Long", strategy.long)
if crossunder
    strategy.close("Long")

// Plot indicators
plot(sma_fast, color=color.green)
plot(sma_slow, color=color.red)
```

## Architecture

### Backend Components

```
backend/
├── pine2py/                    # Pine Script translation library
│   ├── translator.py          # Main translation engine
│   ├── executor.py            # Strategy execution
│   ├── parser.py              # Pine Script parser
│   ├── mapper.py              # Function mappings
│   └── plotting.py            # Plot utilities
│
└── api/
    └── pinescript_endpoints.py # REST API endpoints
```

### Frontend Components

```
frontend/src/components/
├── PineScriptEditor.tsx        # Main editor UI
└── PineScriptChartOverlay.tsx  # Strategy visualization
```

### Data Flow

```
User Pine Script
    ↓
Translation API (pine2py)
    ↓
Python Code
    ↓
Execution Engine (pandas + TA-Lib)
    ↓
Chart Data + Orders + Indicators
    ↓
Visualization (TradingView Charts)
```

## Installation & Setup

### 1. Install Backend Dependencies

```bash
cd backend

# Install Python packages
pip install -r requirements.txt

# Install TA-Lib (system dependency) - REQUIRED for Pine Script execution
# macOS: brew install ta-lib && pip install ta-lib
# Ubuntu/Debian: sudo apt-get install -y ta-lib && pip install ta-lib
# Windows: Download from https://www.ta-lib.org/

# Alternative: Use pandas_ta as a fallback (modify mapper.py)
# pip install pandas-ta
```

**Note**: TA-Lib is required for the Pine Script indicators to work. The translation will still work without TA-Lib, but execution will fail.

### 2. Start Backend Server

```bash
cd /home/dev/projects/electron-app/marketforge-pro-dev-testing
npm run start:backend
```

Backend runs on: http://localhost:8000

### 3. Start Frontend

```bash
npm run start:frontend
```

Frontend runs on: http://localhost:3000

### 4. Access Pine Script Editor

1. Navigate to http://localhost:3000
2. Enable "Pine Script Editor" toggle
3. Start writing strategies!

## Performance Considerations

- **Translation**: < 100ms for typical strategies
- **Execution**: Depends on data size and complexity
  - 500 candles: ~500ms
  - 2000 candles: ~2s
- **Chart Rendering**: < 200ms (TradingView Lightweight Charts)

## Limitations

### Current Limitations
- No multi-timeframe analysis support yet
- Limited to single-asset strategies
- No alert() function support
- Strategy tester metrics not yet implemented

### Planned Enhancements
- [ ] Real-time strategy execution
- [ ] Multi-symbol strategies
- [ ] Portfolio backtesting
- [ ] Risk metrics (Sharpe, max drawdown, etc.)
- [ ] Strategy optimization
- [ ] Export results to CSV/JSON

## Troubleshooting

### TA-Lib Import Error
```
ImportError: cannot import name 'talib'
```

**Solution**: Install system TA-Lib library:
- macOS: `brew install ta-lib`
- Ubuntu: `sudo apt-get install ta-lib`
- Then: `pip install ta-lib`

### Translation Errors
- Ensure Pine Script version is v5 or v6 (`//@version=5`)
- Check for unsupported functions in error message
- Refer to `/api/pinescript/supported-functions` for full list

### Execution Fails
- Verify symbol exists in data source
- Check timeframe is supported (1m, 5m, 15m, 1h, 4h, 1d)
- Ensure sufficient historical data (limit >= 100)

## Example Use Cases

### 1. RSI Oversold/Overbought Strategy

```pinescript
//@version=5
strategy("RSI Strategy")
rsi = ta.rsi(close, 14)

if rsi < 30
    strategy.entry("Long", strategy.long)
if rsi > 70
    strategy.close("Long")

plot(rsi)
```

### 2. MACD Cross Strategy

```pinescript
//@version=5
strategy("MACD Cross")
[macd, signal, hist] = ta.macd(close, 12, 26, 9)

if ta.crossover(macd, signal)
    strategy.entry("Long", strategy.long)
if ta.crossunder(macd, signal)
    strategy.close("Long")

plot(macd)
plot(signal)
```

### 3. Dual Moving Average

```pinescript
//@version=5
indicator("Dual MA", overlay=true)
ema20 = ta.ema(close, 20)
ema50 = ta.ema(close, 50)

plot(ema20, color=color.blue)
plot(ema50, color=color.red)
```

## Contributing

To add new Pine Script functions:

1. Update `backend/pine2py/mapper.py` with function mapping
2. Add translation logic in `backend/pine2py/translator.py`
3. Update supported functions list in `pinescript_endpoints.py`
4. Add test cases

## References

- [TradingView Pine Script v5 Reference](https://www.tradingview.com/pine-script-reference/v5/)
- [TA-Lib Documentation](https://ta-lib.org/)
- [pine2py Library](../pine2py/)
- [MarketForge Pro Docs](./README.md)

---

**Integration Complete! 🎉**

The pine2py library is now fully integrated into MarketForge Pro, providing powerful Pine Script translation and execution capabilities.
