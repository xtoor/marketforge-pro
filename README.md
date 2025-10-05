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
- **🔔 Price Alerts**: Real-time WebSocket alerts with visual notifications and multiple conditions
- **💾 Strategy Development**: Python-based strategy engine with advanced backtesting metrics
- **📈 Paper Trading**: Full order execution simulation with position management
- **💼 Portfolio Tracking**: Real-time P&L tracking with position monitoring
- **🔐 User Authentication**: Secure JWT-based authentication with bcrypt password hashing
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

   Note: The project includes authentication packages (jsonwebtoken, bcryptjs) installed with `--legacy-peer-deps` due to Vite version compatibility.

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

# Authentication (Change in production!)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Optional: External API keys (if using paid data sources)
# COINGECKO_API_KEY=your_api_key_here
```

**⚠️ Security Note**: Always change the `JWT_SECRET` to a strong, random value in production. Never commit your `.env` file to version control.

---

## 📖 Usage

### Getting Started

1. **Create Account**: Register a new account on the auth page or login if you already have one
2. **Select a Symbol**: Choose from Bitcoin, Ethereum, or other supported cryptocurrencies
3. **Choose Timeframe**: Select from 1m, 5m, 15m, 30m, 1h, 4h, 1d, or 1w intervals
4. **Add Indicators**: Click the Indicators panel to add technical analysis overlays
5. **Drawing Tools**: Use the toolbar to draw trend lines and annotations on your chart
6. **Set Alerts**: Create price alerts with conditions (above/below/crosses) for real-time notifications
7. **Paper Trade**: Execute buy/sell orders in the Paper Trading panel with simulated execution
8. **Track Portfolio**: Monitor your positions, P&L, and available balance in real-time
9. **Develop Strategies**: Use the Strategy Editor to write Python strategies and backtest them

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

### Paper Trading

Practice trading without risk:

```
1. Select a symbol from the watchlist
2. Open the Paper Trading panel in the left sidebar
3. Choose Buy or Sell
4. Select Market or Limit order type
5. Enter quantity (and limit price if applicable)
6. Click "Place Buy/Sell Order"
7. View your positions in the Portfolio section
```

**Starting Capital**: $100,000 (simulated)
**Order Types**: Market (instant execution), Limit (price-based execution)
**Position Management**: Automatic P&L calculation, average entry price tracking

### Alert System

Create intelligent price alerts:

```
1. Click the Alerts panel
2. Click the + button
3. Select symbol and alert type (Price or Indicator)
4. Choose condition:
   - Above: Trigger when price is above target
   - Below: Trigger when price is below target
   - Crosses Above: Trigger when price crosses above target
   - Crosses Below: Trigger when price crosses below target
5. Enter target value
6. Create alert
```

Alerts trigger automatically and send WebSocket notifications to your dashboard. Triggered alerts are automatically deactivated.

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
- [x] Complete alert system with WebSocket notifications
- [x] Advanced backtesting engine with performance metrics
- [x] User authentication and authorization (JWT)
- [x] Portfolio tracking and position management
- [x] Paper trading mode with order simulation
- [x] Strategy editor UI with Monaco Editor

### 🔄 In Progress

- [ ] Mobile responsive design optimization
- [ ] Additional data source integrations
- [ ] Advanced chart pattern recognition
- [ ] Multi-asset correlation analysis

### 📈 Development Status

| Component | Status | Completion |
|-----------|--------|------------|
| Backend API | 🟢 Functional | 95% |
| Frontend UI | 🟢 Functional | 90% |
| Python Indicators | 🟢 Functional | 90% |
| Strategy Engine | 🟢 Functional | 85% |
| Data Pipeline | 🟢 Functional | 85% |
| Alert System | 🟢 Functional | 100% |
| Paper Trading | 🟢 Functional | 100% |
| Authentication | 🟢 Functional | 100% |
| Portfolio Tracking | 🟢 Functional | 95% |
| Backtesting | 🟢 Functional | 90% |
| Documentation | 🟡 In Progress | 65% |
| Testing Suite | 🔴 Planned | 25% |

---

## 🎯 Recent Achievements (Phase 2 - Q1 2025)

Phase 2 development has been **completed** with all advanced trading features now functional:

### 🔔 Alert System
- Real-time price monitoring every 10 seconds
- WebSocket-based instant notifications
- Support for: Above, Below, Crosses Above, Crosses Below conditions
- Auto-deactivation on trigger
- Full CRUD API with database persistence

### 📊 Enhanced Backtesting
- Real market data integration
- 10+ performance metrics: Sharpe Ratio, Win Rate, Profit Factor, Max Drawdown
- Trade-by-trade analysis with entry/exit details
- Equity and drawdown curves
- 60-second timeout for complex strategies

### 🔐 Authentication System
- JWT token-based authentication
- bcrypt password hashing (10 salt rounds)
- Protected API endpoints with middleware
- Login/Register UI with validation
- Session persistence via localStorage

### 💼 Portfolio Management
- Real-time balance and P&L calculation
- Position-level tracking with unrealized gains/losses
- Available cash vs. capital allocation
- Expandable position details with percentages
- Live updates via React Query

### 📈 Paper Trading Engine
- Market and limit order execution
- Position management (open, add, reduce, close)
- Balance validation to prevent over-trading
- Average entry price calculations
- Opposite-side order handling
- WebSocket order notifications

### 🎨 Strategy Editor
- Monaco Editor integration for Python code
- API documentation tab
- Save/Load strategy functionality
- One-click backtesting
- Enhanced results visualization

---

## 🗺️ Roadmap

### Phase 1: Core Platform ✅ (Completed)
- ✅ Professional charting with Lightweight Charts v5
- ✅ Python technical indicators (13+ indicators)
- ✅ Real-time WebSocket data streaming
- ✅ Multi-timeframe support (1m-1w)
- ✅ Drawing tools and chart persistence
- ✅ Electron desktop application

### Phase 2: Advanced Trading Tools ✅ (Completed - Q1 2025)
- ✅ Complete alert system with notifications
- ✅ Advanced backtesting engine with metrics
- ✅ User authentication and authorization
- ✅ Portfolio tracking and position management
- ✅ Strategy editor UI with Monaco Editor
- ✅ Paper trading mode
- ✅ Order execution simulation

### Phase 3: Enhanced Analytics 🔄 (Current - Q2 2025)
- 🔄 Advanced charting patterns recognition
- 🔄 Multi-asset watchlists enhancement
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
│       │   │   ├── Alerts.tsx        # Alert management UI
│       │   │   ├── Portfolio.tsx     # Portfolio tracking
│       │   │   ├── OrderPanel.tsx    # Paper trading orders
│       │   │   └── TradingChart.tsx  # Main chart component
│       │   └── ui/         # shadcn/ui components
│       ├── pages/          # Route pages
│       │   ├── trading-dashboard.tsx # Main trading page
│       │   ├── strategy-editor.tsx   # Strategy editor
│       │   └── auth.tsx              # Login/Register page
│       ├── stores/         # Zustand state management
│       ├── hooks/          # Custom React hooks
│       └── lib/            # Utility functions
├── server/                 # Express.js backend
│   ├── index.ts            # Server entry point
│   ├── routes.ts           # API endpoints
│   ├── storage.ts          # Database operations
│   ├── auth.ts             # JWT authentication
│   ├── paperTrading.ts     # Paper trading engine
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

### Alerts
- `POST /api/alerts` - Create price alert
- `GET /api/alerts/:userId` - Get user alerts
- `PUT /api/alerts/:id` - Update alert
- `DELETE /api/alerts/:id` - Delete alert

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (requires auth)

### Paper Trading
- `POST /api/orders` - Execute paper trading order
- `GET /api/orders/:userId` - Get user orders
- `DELETE /api/orders/:orderId` - Cancel order
- `GET /api/positions/:userId` - Get user positions

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

## 📝 Changelog

### Phase 2 Release - Q1 2025 (Current)

**New Features:**
- ✨ Complete alert system with WebSocket real-time notifications
- ✨ JWT-based user authentication and authorization
- ✨ Paper trading engine with order execution simulation
- ✨ Portfolio tracking with real-time P&L calculations
- ✨ Enhanced backtesting with 10+ performance metrics
- ✨ Strategy editor improvements and Monaco integration

**Improvements:**
- 🚀 Backend API performance increased to 95%
- 🚀 Frontend UI completion at 90%
- 🚀 Real market data integration for backtesting
- 🚀 Position management with average entry pricing
- 🚀 WebSocket broadcasting for orders and alerts

**Technical:**
- 🔧 Added `server/auth.ts` for JWT authentication
- 🔧 Added `server/paperTrading.ts` for order simulation
- 🔧 Added `client/src/pages/auth.tsx` for login/register
- 🔧 Added `client/src/components/trading/OrderPanel.tsx`
- 🔧 Enhanced `alertMonitor.ts` with database integration
- 🔧 Updated storage with `updateAlert` and position queries

**Dependencies:**
- 📦 Added `jsonwebtoken` ^9.0.2
- 📦 Added `bcryptjs` ^2.4.3
- 📦 Added `@types/jsonwebtoken` and `@types/bcryptjs`

**Documentation:**
- 📚 Updated README with Phase 2 achievements
- 📚 Added authentication setup instructions
- 📚 Added paper trading usage guide
- 📚 Added alert system documentation
- 📚 Updated API endpoints documentation

---

<div align="center">

**⭐ Star this repository if you find it useful! ⭐**

Made with ❤️ by the Resonance.ai community

[⬆ Back to Top](#-marketforge-pro)

</div>
