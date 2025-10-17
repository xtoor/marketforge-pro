#!/bin/bash
#
# Simple Windows Package Creator (without full Electron build)
# Creates a portable package with all necessary files
#

set -e

echo "================================================"
echo "  MarketForge Pro - Simple Windows Package"
echo "================================================"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

VERSION="1.0.0"
PACKAGE_DIR="MarketForge-Pro-Win-${VERSION}"
OUTPUT_DIR="release"

echo -e "${BLUE}[1/5]${NC} Creating package directory..."
rm -rf "$OUTPUT_DIR/$PACKAGE_DIR"
mkdir -p "$OUTPUT_DIR/$PACKAGE_DIR"

echo -e "${BLUE}[2/5]${NC} Copying backend files..."
mkdir -p "$OUTPUT_DIR/$PACKAGE_DIR/backend"
cp -r backend/* "$OUTPUT_DIR/$PACKAGE_DIR/backend/"
find "$OUTPUT_DIR/$PACKAGE_DIR/backend" -name "*.pyc" -delete
find "$OUTPUT_DIR/$PACKAGE_DIR/backend" -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true

echo -e "${BLUE}[3/5]${NC} Copying frontend files..."
mkdir -p "$OUTPUT_DIR/$PACKAGE_DIR/frontend"
cp -r frontend/* "$OUTPUT_DIR/$PACKAGE_DIR/frontend/"

echo -e "${BLUE}[4/5]${NC} Copying configuration and documentation..."
cp .env.example "$OUTPUT_DIR/$PACKAGE_DIR/"
cp README.md "$OUTPUT_DIR/$PACKAGE_DIR/"
cp INSTALL.md "$OUTPUT_DIR/$PACKAGE_DIR/"
cp QUICK_REFERENCE.md "$OUTPUT_DIR/$PACKAGE_DIR/"
cp LICENSE "$OUTPUT_DIR/$PACKAGE_DIR/"
cp NOTICE "$OUTPUT_DIR/$PACKAGE_DIR/"
cp package.json "$OUTPUT_DIR/$PACKAGE_DIR/"
cp package-lock.json "$OUTPUT_DIR/$PACKAGE_DIR/"
cp tsconfig.json "$OUTPUT_DIR/$PACKAGE_DIR/"
cp vite.config.ts "$OUTPUT_DIR/$PACKAGE_DIR/"
cp setup.sh "$OUTPUT_DIR/$PACKAGE_DIR/"

# Copy electron files
mkdir -p "$OUTPUT_DIR/$PACKAGE_DIR/electron"
cp -r electron/* "$OUTPUT_DIR/$PACKAGE_DIR/electron/"

echo -e "${BLUE}[5/5]${NC} Creating installation scripts..."

# Windows batch file
cat > "$OUTPUT_DIR/$PACKAGE_DIR/INSTALL-WINDOWS.bat" << 'EOF'
@echo off
echo ================================================
echo   MarketForge Pro - Windows Installation
echo ================================================
echo.

echo Checking Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found!
    echo Please install Python 3.9+ from https://www.python.org/
    pause
    exit /b 1
)

echo Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js not found!
    echo Please install Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
)

echo.
echo Installing Python dependencies...
python -m venv venv
call venv\Scripts\activate
pip install --upgrade pip
pip install -r backend\requirements.txt

echo.
echo Installing Node.js dependencies...
npm install

echo.
echo Creating .env file...
copy .env.example .env

echo.
echo ================================================
echo   Installation Complete!
echo ================================================
echo.
echo To start MarketForge Pro, run: START-WINDOWS.bat
echo.
pause
EOF

# Windows start script
cat > "$OUTPUT_DIR/$PACKAGE_DIR/START-WINDOWS.bat" << 'EOF'
@echo off
echo Starting MarketForge Pro...

start "Backend" cmd /c "venv\Scripts\activate && uvicorn backend.api.main:app --host 0.0.0.0 --port 8000"
timeout /t 5 /nobreak >nul

start "Frontend" cmd /c "npm run dev"

echo.
echo MarketForge Pro is starting...
echo Backend: http://localhost:8000
echo Frontend: http://localhost:3000
echo.
echo Close this window to stop the servers.
pause
EOF

# README
cat > "$OUTPUT_DIR/$PACKAGE_DIR/README-WINDOWS.txt" << 'EOF'
MarketForge Pro - Windows Installation
=======================================

REQUIREMENTS:
- Python 3.9 or higher (https://www.python.org/)
- Node.js 18 or higher (https://nodejs.org/)
- 4 GB RAM minimum
- 2 GB free disk space

INSTALLATION STEPS:

1. Install Python 3.9+ if not already installed
   Download from: https://www.python.org/downloads/
   Make sure to check "Add Python to PATH" during installation!

2. Install Node.js 18+ if not already installed
   Download from: https://nodejs.org/

3. Run INSTALL-WINDOWS.bat
   This will install all dependencies automatically.

4. Run START-WINDOWS.bat
   This will start both backend and frontend servers.

5. Open your browser to:
   http://localhost:3000

CONFIGURATION:

Edit the .env file to configure API keys and settings.

TROUBLESHOOTING:

- If "Python not found": Add Python to your system PATH
- If "Node not found": Add Node.js to your system PATH
- If port 8000 or 3000 is in use: Close other applications

For full documentation, see:
- README.md
- INSTALL.md
- QUICK_REFERENCE.md

SUPPORT:

GitHub Issues: https://github.com/marketforge-pro/marketforge-pro/issues
EOF

echo -e "${BLUE}Creating archive...${NC}"
cd "$OUTPUT_DIR"
zip -q -r "${PACKAGE_DIR}.zip" "$PACKAGE_DIR"
cd ..

# Generate checksum
if command -v sha256sum &> /dev/null; then
    sha256sum "$OUTPUT_DIR/${PACKAGE_DIR}.zip" > "$OUTPUT_DIR/${PACKAGE_DIR}.zip.sha256"
fi

echo ""
echo "================================================"
echo -e "${GREEN}    PACKAGE COMPLETE!${NC}"
echo "================================================"
echo ""
echo "Output:"
echo "  📦 $OUTPUT_DIR/${PACKAGE_DIR}.zip"
ls -lh "$OUTPUT_DIR/${PACKAGE_DIR}.zip"
echo ""
if [ -f "$OUTPUT_DIR/${PACKAGE_DIR}.zip.sha256" ]; then
    echo "Checksum:"
    cat "$OUTPUT_DIR/${PACKAGE_DIR}.zip.sha256"
    echo ""
fi
echo "Instructions:"
echo "  1. Extract the ZIP file on Windows"
echo "  2. Run INSTALL-WINDOWS.bat"
echo "  3. Run START-WINDOWS.bat"
echo ""
echo -e "${YELLOW}Note:${NC} This is a portable package. For a full installer with"
echo "      embedded Python, use the full build-windows.sh script."
echo ""
