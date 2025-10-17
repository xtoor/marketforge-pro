<div align="center">

# 📈 MarketForge Pro

**Advanced Financial Visualization Platform**

Professional trading platform with TradingView integration, Pine Script execution, and AI-powered market analysis

[![Python](https://img.shields.io/badge/Python-3.9%2B-blue?logo=python&logoColor=white)](https://python.org)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green?logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109-teal?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-blue?logo=react&logoColor=white)](https://react.dev/)
[![License](https://img.shields.io/badge/License-Apache%202.0-red)](LICENSE)

[**Download**](https://github.com/marketforge-pro/marketforge-pro/releases) • [**Documentation**](INSTALL.md) • [**Report Bug**](https://github.com/marketforge-pro/marketforge-pro/issues)

</div>

---

## ✨ Features

<table>
<tr>
<td width="50%">

### 📊 **Advanced Charting**
- TradingView lightweight charts integration
- Real-time candlestick data
- 50+ technical indicators
- Custom drawing tools
- Multi-timeframe analysis

### 🖥️ **Pine Script Integration**
- Execute Pine Script v5/v6 strategies
- Built-in code editor with syntax highlighting
- Real-time strategy backtesting
- 200+ candles historical data
- TA-Lib powered indicators

### 🤖 **AI & Machine Learning**
- PyTorch-based prediction models
- Reinforcement learning strategies
- Pattern recognition algorithms
- Sentiment analysis integration
- Custom ML model training

</td>
<td width="50%">

### 💼 **Multi-Broker Support**
- Kraken, Coinbase, Binance, Gemini
- Unified API via ccxt library
- Real-time order execution
- Portfolio synchronization
- Rate limiting & error handling

### 📈 **Paper Trading**
- Risk-free strategy testing
- Persistent trade history (SQLite/PostgreSQL)
- P&L tracking
- Position management
- Performance analytics

### 🔔 **Smart Alerts**
- Price movement notifications
- Strategy signal alerts
- Resonance.ai scanner integration
- Desktop notifications (Electron)
- Webhook support

</td>
</tr>
</table>

---

## 🚀 Quick Start

### Option 1: One-Click Installer (Windows)

1. Download the latest installer from [Releases](https://github.com/marketforge-pro/marketforge-pro/releases)
2. Run `MarketForge-Pro-Setup-1.0.0.exe`
3. Follow the setup wizard
4. Launch from Start Menu

### Option 2: Automated Setup (Linux/macOS)

```bash
# Clone repository
git clone https://github.com/marketforge-pro/marketforge-pro.git
cd marketforge-pro

# Run automated setup
bash setup.sh

# Start servers
bash start-servers.sh
```

**Access at:** [http://localhost:3000](http://localhost:3000)

### Option 3: Docker

```bash
# Quick start with Docker Compose
docker-compose up -d

# Access at http://localhost:80
```

📖 **Full installation guide:** [INSTALL.md](INSTALL.md)

---

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [Installation Guide](INSTALL.md) | Detailed installation instructions for all platforms |
| [Quick Start](QUICKSTART.md) | Get started in 5 minutes |
| [Pine Script Integration](PINESCRIPT_INTEGRATION.md) | Pine Script execution guide |
| [API Documentation](http://localhost:8000/docs) | Interactive API documentation (Swagger) |
| [Contributing](CONTRIBUTING.md) | How to contribute to the project |
| [Security Policy](SECURITY.md) | Security guidelines and vulnerability reporting |
| [Troubleshooting](TROUBLESHOOTING.md) | Common issues and solutions |

---

## 💻 Tech Stack

### Backend
- **FastAPI** - High-performance async Python web framework
- **Uvicorn** - Lightning-fast ASGI server
- **SQLAlchemy** - ORM with SQLite/PostgreSQL support
- **ccxt** - Unified cryptocurrency exchange API
- **TA-Lib** - Technical analysis library
- **PyTorch** - Machine learning framework
- **Stable-Baselines3** - Reinforcement learning algorithms

### Frontend
- **React 18** - UI framework with hooks
- **TypeScript** - Type-safe JavaScript
- **Vite** - Next-generation build tool
- **TradingView Charts** - Professional charting library
- **React Query** - Data fetching & caching
- **Zustand** - Lightweight state management
- **Axios** - HTTP client

### Desktop App
- **Electron** - Cross-platform desktop framework
- **electron-builder** - Installer creation
- **electron-store** - Encrypted local storage

### DevOps
- **Docker** - Containerization
- **GitHub Actions** - CI/CD pipeline
- **pre-commit** - Git hooks for code quality
- **pytest** - Python testing
- **Jest** - JavaScript testing

---

## 📊 Pine Script Example

```pinescript
//@version=5
strategy("SMA Crossover", overlay=true)

// Define moving averages
fast = ta.sma(close, 9)
slow = ta.sma(close, 21)

// Entry signals
if ta.crossover(fast, slow)
    strategy.entry("Long", strategy.long)

if ta.crossunder(fast, slow)
    strategy.close("Long")

// Plot indicators
plot(fast, color=color.green, title="Fast SMA")
plot(slow, color=color.red, title="Slow SMA")
```

**Supported Functions:**
- Built-ins: `close`, `open`, `high`, `low`, `volume`, `time`, `bar_index`
- Indicators: `ta.sma`, `ta.ema`, `ta.rsi`, `ta.macd`, `ta.crossover`, `ta.crossunder`
- Strategy: `strategy.entry`, `strategy.exit`, `strategy.close`

📖 See full documentation: [PINESCRIPT_INTEGRATION.md](PINESCRIPT_INTEGRATION.md)

---

## 🏗️ Architecture

```
marketforge-pro/
├── backend/                 # FastAPI backend
│   ├── api/                 # API endpoints
│   │   ├── main.py          # Application entry point
│   │   ├── config.py        # Configuration management
│   │   ├── chart_data.py    # Chart data endpoints
│   │   ├── paper_trading_endpoints.py
│   │   ├── pinescript_endpoints.py
│   │   └── ...
│   ├── middleware/          # Custom middleware
│   │   ├── error_handler.py
│   │   ├── logging_middleware.py
│   │   └── rate_limiter.py
│   ├── database/            # Database models & session
│   │   ├── models.py
│   │   └── session.py
│   ├── bridges/             # External integrations
│   │   ├── resonance_bridge.py
│   │   └── tradingview_bridge.py
│   ├── pine2py/             # Pine Script translator
│   └── tests/               # Backend tests
├── frontend/                # React frontend
│   └── src/
│       ├── components/      # React components
│       │   ├── TradingChart.tsx
│       │   ├── PineScriptEditor.tsx
│       │   └── ...
│       ├── hooks/           # Custom hooks
│       └── utils/           # Utilities
├── electron/                # Electron desktop app
│   ├── main.js              # Main process
│   ├── preload.js           # Preload script
│   └── wizard/              # Setup wizard
├── docs/                    # Documentation
└── scripts/                 # Build & deployment scripts
```

---

## 🛠️ Development

### Prerequisites

- Python 3.9+ (recommended: 3.11)
- Node.js 18+ (recommended: 20 LTS)
- Git

### Setup Development Environment

```bash
# Clone repository with submodules
git clone https://github.com/marketforge-pro/marketforge-pro.git
cd marketforge-pro
git submodule update --init --recursive

# Install pre-commit hooks
pip install pre-commit
pre-commit install

# Run automated setup
bash setup.sh
```

### Running in Development Mode

```bash
# Terminal 1 - Backend
source venv/bin/activate
uvicorn backend.api.main:app --reload --port 8000

# Terminal 2 - Frontend
npm run dev

# Terminal 3 - Electron (optional)
npm run dev:electron
```

### Running Tests

```bash
# Backend tests
pytest backend/tests/ --cov=backend

# Frontend tests
npm test

# Linting
npm run lint
black backend/
```

### Building

```bash
# Frontend production build
npm run build

# Docker build
docker build -t marketforge-pro .

# Windows installer
bash build-windows.sh

# Cross-platform builds
npm run build:all
```

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Quick Contribution Guide

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `pytest` and `npm test`
5. Commit changes: `git commit -m 'feat: add amazing feature'`
6. Push to branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Development Guidelines

- Follow [PEP 8](https://pep8.org/) for Python code
- Use TypeScript for all new frontend code
- Write tests for all new features
- Update documentation as needed
- Follow [Conventional Commits](https://www.conventionalcommits.org/) format

---

## 📜 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

### Third-Party Licenses

This project uses the following open-source libraries:

- FastAPI (MIT License)
- React (MIT License)
- TradingView Lightweight Charts (Apache 2.0)
- Electron (MIT License)
- And many more - see [NOTICE](NOTICE) for complete list

---

## 🔒 Security

Security is a top priority. If you discover a security vulnerability, please email **security@marketforge-pro.com** instead of using the issue tracker.

See [SECURITY.md](SECURITY.md) for more information.

---

## 📞 Support & Community

- **Issues**: [GitHub Issues](https://github.com/marketforge-pro/marketforge-pro/issues)
- **Discussions**: [GitHub Discussions](https://github.com/marketforge-pro/marketforge-pro/discussions)
- **Documentation**: [Full Documentation](INSTALL.md)

---

## ⚠️ Disclaimer

**MarketForge Pro is a visualization and analysis tool only and does not provide financial advice.**

Trading and investment in cryptocurrencies and financial instruments carries significant risk of loss. Past performance is not indicative of future results. Always conduct your own research and consult with qualified financial advisors before making investment decisions.

The developers of MarketForge Pro are not responsible for any financial losses incurred while using this software.

---

## 🌟 Stargazers

[![Stargazers repo roster for @marketforge-pro/marketforge-pro](https://reporoster.com/stars/dark/marketforge-pro/marketforge-pro)](https://github.com/marketforge-pro/marketforge-pro/stargazers)

---

<div align="center">

**Made with ❤️ by the MarketForge Pro Team**

[Website](https://marketforge-pro.com) • [Twitter](https://twitter.com/marketforgepro) • [Discord](https://discord.gg/marketforgepro)

© 2025 MarketForge Pro Team. All rights reserved.

</div>
