# Pine Script Quick Start Guide

## 🚀 Run MarketForge Pro with Pine Script

### Start the App (2 commands)

```bash
# Terminal 1: Backend
cd /home/dev/projects/electron-app/marketforge-pro-dev-testing
npm run start:backend

# Terminal 2: Frontend
npm run start:frontend
```

Access at: **http://localhost:3000**

### Enable Pine Script Editor

1. Open http://localhost:3000
2. Check ✅ **"Pine Script Editor"** toggle
3. The editor appears below the controls

## 📝 Try Your First Strategy

### Example 1: SMA Crossover (5 minutes)

**Step 1:** Select "SMA Crossover Strategy" from examples dropdown

**Step 2:** Configure:
- Symbol: `BTC/USD`
- Timeframe: `1h`

**Step 3:** Click **"Execute Strategy"**

**Result:** See chart with:
- Green/Red SMA lines
- ↑ Green arrows (buy signals)
- ↓ Red arrows (sell signals)
- Orders table below

### Example 2: RSI Strategy

```pinescript
//@version=5
strategy("RSI Oversold/Overbought")

rsi_length = input.int(14, title="RSI Length")
oversold = input.int(30, title="Oversold Level")
overbought = input.int(70, title="Overbought Level")

rsi = ta.rsi(close, rsi_length)

if rsi < oversold
    strategy.entry("Long", strategy.long)
if rsi > overbought
    strategy.close("Long")

plot(rsi)
```

1. Paste code into editor
2. Set symbol: `ETH/USD`
3. Click "Execute Strategy"
4. View RSI line and trade markers

### Example 3: MACD Cross

```pinescript
//@version=5
strategy("MACD Strategy")

[macd_line, signal_line, hist] = ta.macd(close, 12, 26, 9)

if ta.crossover(macd_line, signal_line)
    strategy.entry("Long", strategy.long)
if ta.crossunder(macd_line, signal_line)
    strategy.close("Long")

plot(macd_line, color=color.blue)
plot(signal_line, color=color.orange)
```

## 🎯 Key Features

### Translation
- Click **"Translate to Python"** to see generated code
- Useful for learning how Pine Script maps to Python

### Execution
- Click **"Execute Strategy"** to backtest
- Results show: Orders, Positions, Indicators

### Visualization
- Interactive TradingView chart
- Hover over markers for details
- Zoom and pan supported

## ✅ What Works

✅ Indicators: SMA, EMA, RSI, MACD
✅ Crossovers: crossover(), crossunder()
✅ Strategies: entry(), exit(), close()
✅ Inputs: input.int(), input.float()
✅ Plotting: plot() with multiple series

## ⚠️ Important Notes

### TA-Lib Required
For execution to work, install TA-Lib:

```bash
# macOS
brew install ta-lib
pip install ta-lib

# Ubuntu/Debian
sudo apt-get install -y ta-lib
pip install ta-lib
```

Without TA-Lib:
- ✅ Translation still works
- ❌ Execution will fail

### Supported Symbols
- BTC/USD, ETH/USD, BNB/USD (crypto)
- bitcoin, ethereum (CoinGecko IDs)

### Supported Timeframes
- 1m, 5m, 15m (minutes)
- 1h, 4h (hours)
- 1d (daily)

## 🐛 Troubleshooting

### "Translation failed"
- Check Pine Script version: `//@version=5` or `//@version=6`
- Verify syntax (missing parentheses, etc.)
- Check supported functions: GET `/api/pinescript/supported-functions`

### "Execution failed"
- Install TA-Lib (see above)
- Check symbol exists
- Verify timeframe is supported

### No chart appears
- Wait for execution to complete (can take 2-5 seconds)
- Check browser console for errors (F12)
- Verify backend is running (http://localhost:8000/api/health)

### Orders not showing
- Strategy must have `strategy()` declaration (not `indicator()`)
- Add buy/sell logic with `strategy.entry()` / `strategy.close()`
- Ensure conditions are being met (try simpler logic first)

## 📚 Learn Pine Script

### Official Resources
- [TradingView Pine Script Docs](https://www.tradingview.com/pine-script-docs/)
- [Pine Script v5 Reference](https://www.tradingview.com/pine-script-reference/v5/)

### Quick Syntax

```pinescript
//@version=5
strategy("My Strategy", overlay=true)  // or indicator()

// Inputs
length = input.int(14, title="Period")

// Indicators
sma = ta.sma(close, length)
rsi = ta.rsi(close, 14)
[macd, signal, hist] = ta.macd(close, 12, 26, 9)

// Conditions
bullish = ta.crossover(sma, close)
bearish = ta.crossunder(sma, close)

// Strategy logic
if bullish
    strategy.entry("Long", strategy.long)
if bearish
    strategy.close("Long")

// Plotting
plot(sma, color=color.blue, linewidth=2, title="SMA")
```

## 🎓 Strategy Tips

### 1. Start Simple
Begin with single indicator (SMA, EMA, RSI)

### 2. Test Different Timeframes
- 1h for swing trading
- 15m for intraday
- 1d for position trading

### 3. Combine Indicators
- SMA + RSI (trend + momentum)
- MACD + EMA (momentum + trend)

### 4. Add Risk Management (Coming Soon)
- Stop loss: `strategy.exit()`
- Position sizing
- Max drawdown limits

## 🚀 Advanced Usage

### API Endpoints

```bash
# Translate only
curl -X POST http://localhost:8000/api/pinescript/translate \
  -H "Content-Type: application/json" \
  -d '{"code": "//@version=5\nindicator(\"Test\")\nplot(ta.sma(close, 14))"}'

# Execute strategy
curl -X POST http://localhost:8000/api/pinescript/execute \
  -H "Content-Type: application/json" \
  -d '{
    "code": "//@version=5\nstrategy(\"Test\")\n...",
    "symbol": "BTC/USD",
    "timeframe": "1h"
  }'

# Get examples
curl http://localhost:8000/api/pinescript/examples

# Supported functions
curl http://localhost:8000/api/pinescript/supported-functions
```

### Custom Strategies

Save your strategies:
1. Write in editor
2. Copy Pine Script code
3. Save to `.pine` file locally
4. Paste back when needed

(Database storage coming soon!)

## 🎯 Next Steps

1. ✅ Try the 3 examples above
2. ✅ Modify parameters and re-execute
3. ✅ Write your own simple strategy
4. ✅ Combine multiple indicators
5. ✅ Test on different symbols/timeframes
6. ✅ Check results and optimize

## 📞 Need Help?

- **Docs**: [PINESCRIPT_INTEGRATION.md](./PINESCRIPT_INTEGRATION.md)
- **Summary**: [INTEGRATION_SUMMARY.md](./INTEGRATION_SUMMARY.md)
- **Main README**: [README.md](./README.md)
- **Test**: Run `python3 test_pinescript_integration.py`

---

**Happy Trading! 📈**

*Pine Script integration powered by pine2py*
