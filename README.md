<div align="center">

![MarketForge-Pro Banner](final_chart_screenshot.png)

# 📈 MarketForge-Pro

### *Free Open-Source TradingView Alternative*

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![Node.js](https://img.shields.io/badge/node.js-18+-339933.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/react-18.3+-61dafb.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-5.6-3178c6.svg)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/postgresql-latest-336791.svg)](https://www.postgresql.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![GitHub Stars](https://img.shields.io/github/stars/xtoor/marketforge-pro?style=social)](https://github.com/xtoor/marketforge-pro/stargazers)
[![GitHub Forks](https://img.shields.io/github/forks/xtoor/marketforge-pro?style=social)](https://github.com/xtoor/marketforge-pro/network/members)
[![Issues](https://img.shields.io/github/issues/xtoor/marketforge-pro)](https://github.com/xtoor/marketforge-pro/issues)

**MarketForge-Pro** is a powerful, free, and open-source trading analysis platform designed for traders who want professional-grade charting without premium subscription fees. Built with Node.js, TypeScript, React, and Python, it combines a modern web stack with Python-powered technical analysis for unlimited flexibility in strategy development.

[Features](#-features) • [Installation](#-installation) • [Usage](#-usage) • [Contributing](#-contributing) • [Roadmap](#-roadmap)

</div>

---

## 🌟 Features

- **📊 Advanced Charting**: Professional-grade candlestick charts powered by Lightweight Charts v5
- **⚡ Multiple Timeframes**: 1m, 5m, 15m, 30m, 1h, 4h, 1d, 1w support with seamless switching
- **🐍 Python-Powered Indicators**: 13+ technical indicators (SMA, EMA, RSI, MACD, Bollinger Bands, etc.)
- **🎨 Drawing Tools**: Trend lines, horizontal lines, and chart annotations with persistence
- **🔔 Price Alerts**: Set alerts with visual and notification triggers (in development)
- **💾 Strategy Development**: Python-based strategy engine with backtesting capabilities
- **🌐 Real-time Data**: WebSocket streaming for live market updates from CoinGecko API
- **🖥️ Desktop & Web**: Run as Electron desktop app or web application
- **🎯 Crypto Focus**: Bitcoin, Ethereum, and major cryptocurrency support
- **💰 100% Free**: No premium tiers, no subscriptions, completely open-source

---

## 🚀 Installation

### Prerequisites

Before installing MarketForge-Pro, ensure you have the following installed:

- **Python 3.11+** - [Download Python](https://www.python.org/downloads/)
- **Node.js 18+** - [Download Node.js](https://nodejs.org/)
- **npm** - Comes with Node.js
- **PostgreSQL** - [Download PostgreSQL](https://www.postgresql.org/download/)
- **Git** - [Download Git](https://git-scm.com/)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/xtoor/marketforge-pro.git
   cd marketforge-pro
   ```

2. **Install Node.js dependencies**
   ```bash
   npm install
   ```

3. **Python Setup**
   ```bash
   # Create virtual environment
   python -m venv venv

   # Activate virtual environment
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate

   # Install Python dependencies
   pip install numpy pandas requests
   ```

4. **Database Configuration**
   ```bash
   # Set your PostgreSQL connection string
   export DATABASE_URL="postgresql://username:password@localhost:5432/marketforge"

   # Push database schema
   npm run db:push
   ```

5. **Run the Application**

   **Development Mode (with hot reload):**
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:5000`

   **Production Mode:**
   ```bash
   # Build the application
   npm run build

   # Start production server
   npm start
   ```

6. **Run as Electron Desktop App (Optional)**
   ```bash
   npm run electron
   ```

### Environment Variables

Create a `.env` file in the root directory:

```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/marketforge"

# Server
PORT=5000
NODE_ENV=development

# Optional: External API keys (if using paid data sources)
# COINGECKO_API_KEY=your_api_key_here
```

---

## 📖 Usage

### Getting Started

1. **Select a Symbol**: Choose from Bitcoin, Ethereum, or other supported cryptocurrencies
2. **Choose Timeframe**: Select from 1m, 5m, 15m, 30m, 1h, 4h, 1d, or 1w intervals
3. **Add Indicators**: Click the Indicators panel to add technical analysis overlays
4. **Drawing Tools**: Use the toolbar to draw trend lines and annotations on your chart
5. **Set Alerts**: Create price alerts to track important levels (feature in development)

### Available Indicators

The platform includes 13+ technical indicators:
- **Moving Averages**: SMA, EMA, WMA
- **Oscillators**: RSI, Stochastic, CCI, Williams %R
- **Trend Indicators**: MACD, ADX
- **Volatility**: Bollinger Bands, ATR
- **Volume**: OBV (On-Balance Volume)

### Python Strategy Development

Create custom strategies using the Python engine:

```python
# Example: RSI + Moving Average Strategy
import numpy as np
import pandas as pd

def calculate_signals(ohlc_data):
    # Calculate indicators
    rsi = calculate_rsi(ohlc_data['close'], period=14)
    sma_20 = calculate_sma(ohlc_data['close'], period=20)

    # Generate signals
    signals = []
    for i in range(len(ohlc_data)):
        if rsi[i] < 30 and ohlc_data['close'][i] > sma_20[i]:
            signals.append('BUY')
        elif rsi[i] > 70:
            signals.append('SELL')
        else:
            signals.append('HOLD')

    return signals
```

Backtest your strategies against historical data using the built-in backtesting engine.

---

## 📊 Project Progress

### ✅ Completed Features

- [x] Professional charting with Lightweight Charts v5
- [x] Express.js + TypeScript backend architecture
- [x] React + TypeScript frontend with Vite
- [x] PostgreSQL database with Drizzle ORM
- [x] 13+ Python technical indicators
- [x] Drawing tools (trend lines, horizontal lines)
- [x] Multiple timeframe support (1m-1w)
- [x] Real-time WebSocket data streaming
- [x] CoinGecko API integration
- [x] Electron desktop app support
- [x] Chart persistence and state management
- [x] Error boundary and error handling

### 🔄 In Progress

- [x] Alert monitoring system (backend complete, UI in progress)
- [ ] Advanced backtesting engine with performance metrics
- [ ] User authentication and session management
- [ ] Portfolio tracking and position management
- [ ] Strategy editor UI interface
- [ ] Mobile responsive design optimization
- [ ] Additional data source integrations

### 📈 Development Status

| Component | Status | Completion |
|-----------|--------|------------|
| Backend API | 🟢 Functional | 85% |
| Frontend UI | 🟡 In Progress | 75% |
| Python Indicators | 🟢 Functional | 90% |
| Strategy Engine | 🟡 In Progress | 65% |
| Data Pipeline | 🟢 Functional | 85% |
| Alert System | 🟡 In Progress | 70% |
| Documentation | 🟡 In Progress | 60% |
| Testing Suite | 🔴 Planned | 25% |

---

## 🗺️ Roadmap

### Phase 1: Core Platform ✅ (Completed)
- ✅ Professional charting with Lightweight Charts v5
- ✅ Python technical indicators (13+ indicators)
- ✅ Real-time WebSocket data streaming
- ✅ Multi-timeframe support (1m-1w)
- ✅ Drawing tools and chart persistence
- ✅ Electron desktop application

### Phase 2: Advanced Trading Tools 🔄 (Current - Q1 2025)
- 🔄 Complete alert system with notifications
- 🔄 Advanced backtesting engine with metrics
- 📋 User authentication and authorization
- 📋 Portfolio tracking and position management
- 📋 Strategy editor UI with Monaco Editor
- 📋 Paper trading mode
- 📋 Order execution simulation

### Phase 3: Enhanced Analytics (Q2 2025)
- 📋 Advanced charting patterns recognition
- 📋 Multi-asset watchlists
- 📋 Custom indicator creation UI
- 📋 Performance analytics dashboard
- 📋 Risk management tools
- 📋 Additional data sources (Binance, Coinbase)
- 📋 Mobile responsive design

### Phase 4: Community & AI (Q3-Q4 2025)
- 📋 Strategy marketplace
- 📋 Community strategy sharing
- 📋 AI-powered pattern recognition
- 📋 Machine learning strategy optimization
- 📋 Social trading features
- 📋 Cloud strategy storage and sync
- 📋 API for third-party integrations

---

## 📁 Project Structure

```
marketforge-pro/
├── client/                 # React frontend
│   └── src/
│       ├── components/     # UI components
│       │   ├── trading/    # Trading-specific components
│       │   └── ui/         # shadcn/ui components
│       ├── pages/          # Route pages
│       ├── stores/         # Zustand state management
│       ├── hooks/          # Custom React hooks
│       └── lib/            # Utility functions
├── server/                 # Express.js backend
│   ├── index.ts            # Server entry point
│   ├── routes.ts           # API endpoints
│   ├── storage.ts          # Database operations
│   ├── marketDataService.ts # Market data integration
│   ├── pythonExecutor.ts   # Python process management
│   └── alertMonitor.ts     # Alert monitoring service
├── python/                 # Python analysis engine
│   ├── indicators.py       # Technical indicators library
│   ├── indicator_calculator.py # JSON API wrapper
│   ├── strategy_engine.py  # Strategy execution engine
│   └── backtester.py       # Backtesting engine
├── shared/                 # Shared TypeScript types
│   └── schema.ts           # Drizzle database schema
├── migrations/             # Database migrations
├── electron-main.js        # Electron entry point
└── dist/                   # Build output
```

---

## 🤝 Contributing

We welcome contributions from the community! MarketForge-Pro is an ongoing project with known bugs and missing features.

### How to Contribute

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/AmazingFeature`)
3. **Commit your changes** (`git commit -m 'Add some AmazingFeature'`)
4. **Push to the branch** (`git push origin feature/AmazingFeature`)
5. **Open a Pull Request**

### Contribution Guidelines

- Write clean, documented code
- Follow existing code style and conventions
- Add tests for new features
- Update documentation as needed
- Be respectful and constructive in discussions

### Areas Where We Need Help

- 🐛 Bug fixes and testing
- 📚 Documentation improvements
- 🎨 UI/UX enhancements
- 🔧 New indicator implementations
- 🌐 Internationalization
- 📊 Data source integrations

---

## 🔌 API Endpoints

### Market Data
- `GET /api/symbols` - List all available trading symbols
- `GET /api/market-data/:symbolId/:timeframe` - Get OHLCV candlestick data
- `WS /` - WebSocket connection for real-time market data

### Technical Indicators
- `GET /api/indicators/:symbolId/:timeframe/:indicatorType` - Calculate technical indicator
- Supported indicators: SMA, EMA, RSI, MACD, Bollinger Bands, Stochastic, and more

### Drawing Tools
- `POST /api/drawings` - Save chart drawing
- `GET /api/drawings/:userId/:symbolId/:timeframe` - Load saved drawings
- `DELETE /api/drawings/:id` - Delete drawing

### Alerts (In Progress)
- `POST /api/alerts` - Create price alert
- `GET /api/alerts/:userId` - Get user alerts
- `DELETE /api/alerts/:id` - Delete alert

### Strategies & Backtesting
- `POST /api/strategies` - Save trading strategy
- `POST /api/backtest` - Run strategy backtest
- `GET /api/backtest/:id` - Get backtest results

---

## 🛠️ Tech Stack

### Backend
- **Node.js + TypeScript**: Core backend runtime
- **Express.js**: Web framework and API server
- **Python 3.11+**: Technical analysis engine
- **Pandas & NumPy**: Data manipulation and computations
- **Drizzle ORM**: Type-safe database ORM
- **WebSocket**: Real-time market data streaming

### Frontend
- **React 18+**: UI framework
- **TypeScript**: Type-safe JavaScript
- **Lightweight Charts v5**: Professional charting library
- **Tailwind CSS**: Utility-first styling framework
- **Zustand**: Lightweight state management
- **TanStack Query**: Server state management
- **Wouter**: Minimal routing library
- **shadcn/ui**: Modern component library (Radix UI)

### Database & Tools
- **PostgreSQL**: Primary database with UUID keys
- **Vite**: Lightning-fast build tool and dev server
- **Electron**: Desktop application wrapper (optional)
- **esbuild**: Fast bundler for production builds

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 📞 Contact & Support

- **Issues**: [GitHub Issues](https://github.com/xtoor/marketforge-pro/issues)
- **Discussions**: [GitHub Discussions](https://github.com/xtoor/marketforge-pro/discussions)
- **Discord**: https://discord.gg/ZzJwbFswHz

---

## ⚠️ Disclaimer

MarketForge-Pro is currently under active development and may contain bugs and incomplete features. This software is provided for educational and research purposes. Trading in financial markets involves risk, and you should not trade with money you cannot afford to lose. The developers are not responsible for any financial losses incurred while using this software.

---

## 🙏 Acknowledgments

- Resonance Breakout Scanner for integration - https://github.com/metteyyaX/resonance.ai-scannerv13
- TradingView for inspiration
- The open-source community for various libraries and tools
- All contributors who help make this project better

---

<div align="center">

**⭐ Star this repository if you find it useful! ⭐**

Made with ❤️ by the Resonance.ai community


[⬆ Back to Top](#-marketforge-pro)

</div>
