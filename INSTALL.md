# Installation Guide - MarketForge Pro

Complete installation instructions for all platforms.

## Table of Contents

- [System Requirements](#system-requirements)
- [Quick Start (Automated)](#quick-start-automated)
- [Manual Installation](#manual-installation)
- [Windows Installer](#windows-installer)
- [Docker Installation](#docker-installation)
- [Post-Installation](#post-installation)
- [Troubleshooting](#troubleshooting)

## System Requirements

### Minimum Requirements
- **OS**: Windows 10/11, macOS 11+, Ubuntu 20.04+
- **CPU**: 2 cores
- **RAM**: 4 GB
- **Disk**: 2 GB free space
- **Python**: 3.9 or higher
- **Node.js**: 18 or higher

### Recommended Requirements
- **CPU**: 4+ cores
- **RAM**: 8+ GB
- **Disk**: 5+ GB free space
- **Python**: 3.11
- **Node.js**: 20 LTS

## Quick Start (Automated)

### Linux / macOS

```bash
# Clone repository
git clone https://github.com/marketforge-pro/marketforge-pro.git
cd marketforge-pro

# Run automated setup
bash setup.sh

# Start the application
bash start-servers.sh
```

Open your browser to [http://localhost:3000](http://localhost:3000)

### Windows

Download and run the installer from the [Releases](https://github.com/marketforge-pro/marketforge-pro/releases) page:

1. Download `MarketForge-Pro-Setup-1.0.0.exe`
2. Run the installer
3. Follow the setup wizard
4. Launch MarketForge Pro from the Start Menu

## Manual Installation

### Step 1: Clone Repository

```bash
git clone https://github.com/marketforge-pro/marketforge-pro.git
cd marketforge-pro

# Initialize submodules
git submodule update --init --recursive
```

### Step 2: Install Python Dependencies

```bash
# Create virtual environment
python3 -m venv venv

# Activate virtual environment
# On Linux/macOS:
source venv/bin/activate

# On Windows:
venv\Scripts\activate

# Upgrade pip
pip install --upgrade pip

# Install dependencies
pip install -r backend/requirements.txt
```

### Step 3: Install TA-Lib (Optional but Recommended)

TA-Lib is required for Pine Script execution.

#### Linux (Ubuntu/Debian)

```bash
wget http://prdownloads.sourceforge.net/ta-lib/ta-lib-0.4.0-src.tar.gz
tar -xzf ta-lib-0.4.0-src.tar.gz
cd ta-lib
./configure --prefix=/usr/local
make
sudo make install
sudo ldconfig
cd ..

# Install Python wrapper
pip install ta-lib
```

#### macOS

```bash
brew install ta-lib
pip install ta-lib
```

#### Windows

1. Download pre-compiled DLL from [ta-lib releases](https://github.com/mrjbq7/ta-lib/releases)
2. Extract to `C:\ta-lib`
3. Add `C:\ta-lib\bin` to PATH
4. Install Python wrapper:
   ```cmd
   pip install ta-lib
   ```

### Step 4: Install Node.js Dependencies

```bash
npm install
```

### Step 5: Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env file with your settings
nano .env  # or use your preferred editor
```

### Step 6: Build Frontend

```bash
npm run build
```

### Step 7: Initialize Database

```bash
# Database will be automatically created on first run
# Located at: ./marketforge.db
```

## Windows Installer

### Building from Source

Requirements:
- Node.js 20+
- Python 3.11+
- Git Bash or WSL

```bash
# Install dependencies
npm install

# Build Windows installer
bash build-windows.sh
```

The installer will be created in the `release/` directory.

### Installer Features

- ✅ Automated Python runtime installation
- ✅ Dependency management
- ✅ Desktop and Start Menu shortcuts
- ✅ System tray integration
- ✅ Auto-update support
- ✅ Uninstaller
- ✅ First-run setup wizard

### Silent Installation

```cmd
MarketForge-Pro-Setup-1.0.0.exe /S /D=C:\MarketForge-Pro
```

## Docker Installation

### Using Docker Compose (Recommended)

```bash
# Create .env file first
cp .env.example .env

# Edit .env with your configuration
nano .env

# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

Access the application at [http://localhost:80](http://localhost:80)

### Using Docker Directly

```bash
# Build image
docker build -t marketforge-pro .

# Run container
docker run -d \
  --name marketforge \
  -p 8000:8000 \
  -v marketforge-data:/data \
  -e CORS_ORIGINS=http://localhost:3000 \
  marketforge-pro

# Check logs
docker logs -f marketforge
```

### Production Deployment

```bash
# Use docker-compose with PostgreSQL
cp docker-compose.yml docker-compose.prod.yml

# Edit docker-compose.prod.yml:
# - Uncomment PostgreSQL service
# - Update DATABASE_URL
# - Add SSL certificates

docker-compose -f docker-compose.prod.yml up -d
```

## Post-Installation

### Configure API Keys (Optional)

Edit `.env` file:

```env
# Broker API Keys (optional)
ENABLE_BROKERS=true
KRAKEN_API_KEY=your_key_here
KRAKEN_API_SECRET=your_secret_here

# Data Sources
COINGECKO_API_KEY=your_key_here

# Resonance.ai (optional)
RESONANCE_API_KEY=your_key_here
```

### Verify Installation

```bash
# Check backend health
curl http://localhost:8000/api/health

# Expected response:
# {
#   "api": "healthy",
#   "database": "connected",
#   "tradingview_bridge": "active"
# }
```

### First Run

1. Navigate to [http://localhost:3000](http://localhost:3000)
2. You should see the MarketForge Pro interface
3. Try loading a chart (Bitcoin, Ethereum, etc.)
4. Open the Pine Script editor
5. Run an example strategy

## Troubleshooting

### Backend Won't Start

**Issue**: `ModuleNotFoundError: No module named 'fastapi'`

**Solution**:
```bash
# Ensure virtual environment is activated
source venv/bin/activate  # Linux/macOS
venv\Scripts\activate     # Windows

# Reinstall dependencies
pip install -r backend/requirements.txt
```

### Frontend Build Errors

**Issue**: `Cannot find module 'react'`

**Solution**:
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### TA-Lib Installation Fails

**Issue**: `error: command 'gcc' failed`

**Solution** (Linux):
```bash
# Install build tools
sudo apt-get install build-essential python3-dev

# Then retry TA-Lib installation
```

**Solution** (macOS):
```bash
# Install Xcode command line tools
xcode-select --install

# Install via Homebrew
brew install ta-lib
```

### Port Already in Use

**Issue**: `Error: listen EADDRINUSE: address already in use :::8000`

**Solution**:
```bash
# Find and kill process using port 8000
lsof -ti :8000 | xargs kill -9

# Or use a different port
uvicorn backend.api.main:app --port 8001
```

### Database Errors

**Issue**: `OperationalError: no such table: trades`

**Solution**:
```bash
# Delete database and restart (will lose data!)
rm marketforge.db

# Restart backend to recreate tables
uvicorn backend.api.main:app --reload
```

### Permission Denied (Linux)

**Issue**: `Permission denied: './setup.sh'`

**Solution**:
```bash
chmod +x setup.sh
chmod +x start-servers.sh
```

### Windows Installer Issues

**Issue**: "Windows Defender SmartScreen prevented an unrecognized app"

**Solution**:
1. Click "More info"
2. Click "Run anyway"
3. (Or) Download from verified GitHub release with valid signature

## Updating

### Manual Update

```bash
# Pull latest code
git pull origin main

# Update Python dependencies
source venv/bin/activate
pip install -r backend/requirements.txt --upgrade

# Update Node.js dependencies
npm install

# Rebuild frontend
npm run build

# Restart servers
bash start-servers.sh
```

### Docker Update

```bash
# Pull latest image
docker-compose pull

# Restart services
docker-compose up -d
```

### Windows Installer Update

The Electron app includes auto-update functionality. Updates will be automatically downloaded and installed when available.

## Uninstallation

### Linux/macOS

```bash
# Stop services
pkill -f uvicorn
pkill -f vite

# Remove directory
cd ..
rm -rf marketforge-pro
```

### Windows Installer

1. Open "Add or Remove Programs"
2. Find "MarketForge Pro"
3. Click "Uninstall"
4. Follow prompts

### Docker

```bash
# Stop and remove containers
docker-compose down

# Remove volumes (WARNING: deletes all data)
docker volume rm marketforge_marketforge-data

# Remove image
docker rmi marketforge-pro
```

## Additional Resources

- [Quick Start Guide](QUICKSTART.md)
- [Pine Script Integration](PINESCRIPT_INTEGRATION.md)
- [API Documentation](http://localhost:8000/docs)
- [Troubleshooting Guide](TROUBLESHOOTING.md)
- [Contributing Guidelines](CONTRIBUTING.md)

## Support

- GitHub Issues: [https://github.com/marketforge-pro/marketforge-pro/issues](https://github.com/marketforge-pro/marketforge-pro/issues)
- Documentation: [https://docs.marketforge-pro.com](https://docs.marketforge-pro.com)

---

**Last Updated**: 2025-01-XX
**Version**: 1.0.0
