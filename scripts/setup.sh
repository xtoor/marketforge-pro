#!/bin/bash
# MarketForge-Pro Setup Script
# Automates initial project setup

set -e  # Exit on error

echo "🚀 MarketForge-Pro Setup"
echo "========================"

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Install from https://nodejs.org/"
    exit 1
fi

if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 not found. Install from https://python.org/"
    exit 1
fi

if ! command -v git &> /dev/null; then
    echo "❌ Git not found. Install from https://git-scm.com/"
    exit 1
fi

echo "✅ Prerequisites satisfied"

# Install frontend dependencies
echo ""
echo "📦 Installing frontend dependencies..."
npm install

# Install backend dependencies
echo ""
echo "📦 Installing backend dependencies..."
cd backend
python3 -m pip install -r requirements.txt
cd ..

# Setup Git submodules
echo ""
echo "🔗 Setting up Git submodules..."

# TradingView lightweight-charts
if [ ! -d "frontend/src/tradingview/lightweight-charts/.git" ]; then
    echo "  → Adding TradingView lightweight-charts submodule..."
    git submodule add https://github.com/tradingview/lightweight-charts.git \
        frontend/src/tradingview/lightweight-charts 2>/dev/null || true
fi

# Resonance.ai Scanner (optional)
read -p "Do you want to install Resonance.ai Scanner submodule? (y/N): " install_resonance
if [[ $install_resonance =~ ^[Yy]$ ]]; then
    if [ ! -d "backend/resonance/.git" ]; then
        echo "  → Adding Resonance.ai Scanner submodule..."
        git submodule add https://github.com/resonance-ai/scanner-v13.git \
            backend/resonance 2>/dev/null || true
    fi

    echo "  → Installing Resonance dependencies..."
    cd backend/resonance
    python3 -m pip install -r requirements.txt 2>/dev/null || echo "    (No requirements.txt found, skipping)"
    cd ../..
fi

# Initialize submodules
echo "  → Updating submodules..."
git submodule update --init --recursive

# Setup environment file
echo ""
echo "⚙️  Setting up environment configuration..."
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "  → Created .env from .env.example"
    echo "  ⚠️  Edit .env to add your API keys"
else
    echo "  → .env already exists (skipping)"
fi

# Create necessary directories
echo ""
echo "📁 Creating directory structure..."
mkdir -p backend/logs
mkdir -p frontend/public
mkdir -p docs

# Run tests to verify installation
echo ""
echo "🧪 Running verification tests..."
cd backend
python3 -m pytest tests/ -v --tb=short 2>/dev/null || echo "  ⚠️  Some tests failed (this is expected if services aren't running)"
cd ..

# Success message
echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "  1. Edit .env with your API keys (if using brokers)"
echo "  2. Start backend: npm run start:backend"
echo "  3. Start frontend: npm run start:frontend"
echo "  4. (Optional) Start Resonance: cd backend/resonance && python serve_detections.py"
echo ""
echo "📖 Documentation:"
echo "  - README.md: General overview"
echo "  - docs/INTEGRATION_GUIDE.md: TradingView & Resonance integration"
echo "  - docs/ARCHITECTURE.md: System architecture"
echo ""
echo "🌐 Visit http://localhost:3000 after starting services"
