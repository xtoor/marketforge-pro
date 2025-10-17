#!/bin/bash
#
# MarketForge Pro - Windows Installer Build Script
# Creates Windows installer with embedded Python runtime
#

set -e

echo "================================================"
echo "  MarketForge Pro - Windows Build Script"
echo "================================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: package.json not found. Run this script from the project root.${NC}"
    exit 1
fi

# Version check
VERSION=$(node -p "require('./package.json').version")
echo -e "${BLUE}Building version: ${VERSION}${NC}"
echo ""

# Step 1: Clean previous builds
echo -e "${BLUE}[1/8]${NC} Cleaning previous builds..."
rm -rf dist/ dist-electron/ release/ out/
echo -e "${GREEN}✓${NC} Cleaned"
echo ""

# Step 2: Install dependencies
echo -e "${BLUE}[2/8]${NC} Installing dependencies..."
npm install
echo -e "${GREEN}✓${NC} Dependencies installed"
echo ""

# Step 3: Build frontend
echo -e "${BLUE}[3/8]${NC} Building frontend (Vite)..."
npm run build
echo -e "${GREEN}✓${NC} Frontend built"
echo ""

# Step 4: Download Python embeddable package (if not exists)
PYTHON_VERSION="3.11.0"
PYTHON_URL="https://www.python.org/ftp/python/${PYTHON_VERSION}/python-${PYTHON_VERSION}-embed-amd64.zip"
PYTHON_DIR="python-runtime"

if [ ! -d "$PYTHON_DIR" ]; then
    echo -e "${BLUE}[4/8]${NC} Downloading Python ${PYTHON_VERSION} embeddable package..."
    mkdir -p "$PYTHON_DIR"

    if command -v wget &> /dev/null; then
        wget -q --show-progress "$PYTHON_URL" -O python-embed.zip
    elif command -v curl &> /dev/null; then
        curl -L "$PYTHON_URL" -o python-embed.zip --progress-bar
    else
        echo -e "${RED}Error: wget or curl required to download Python${NC}"
        exit 1
    fi

    unzip -q python-embed.zip -d "$PYTHON_DIR"
    rm python-embed.zip

    # Download get-pip.py
    curl -L https://bootstrap.pypa.io/get-pip.py -o "$PYTHON_DIR/get-pip.py"

    echo -e "${GREEN}✓${NC} Python runtime downloaded"
else
    echo -e "${BLUE}[4/8]${NC} Python runtime already exists"
    echo -e "${GREEN}✓${NC} Skipped download"
fi
echo ""

# Step 5: Install Python dependencies into runtime
echo -e "${BLUE}[5/8]${NC} Installing Python dependencies..."
if [ ! -d "$PYTHON_DIR/Lib/site-packages" ]; then
    # Configure Python embeddable
    echo "import site" >> "$PYTHON_DIR/python311._pth"

    # Install pip
    "$PYTHON_DIR/python.exe" "$PYTHON_DIR/get-pip.py" --no-warn-script-location

    # Install dependencies
    "$PYTHON_DIR/python.exe" -m pip install -r backend/requirements.txt --no-warn-script-location

    echo -e "${GREEN}✓${NC} Python dependencies installed"
else
    echo -e "${GREEN}✓${NC} Python dependencies already installed"
fi
echo ""

# Step 6: Download TA-Lib pre-compiled DLL (optional)
echo -e "${BLUE}[6/8]${NC} Checking TA-Lib..."
if [ ! -f "$PYTHON_DIR/ta_lib.dll" ]; then
    echo -e "${YELLOW}⚠${NC} TA-Lib DLL not found - Pine Script execution may not work"
    echo -e "${YELLOW}→${NC} Download from: https://github.com/mrjbq7/ta-lib/releases"
    echo -e "${YELLOW}→${NC} Place ta_lib.dll in $PYTHON_DIR/"
else
    echo -e "${GREEN}✓${NC} TA-Lib found"
fi
echo ""

# Step 7: Build Electron installer
echo -e "${BLUE}[7/8]${NC} Building Electron installer..."
npm run build:electron

echo -e "${GREEN}✓${NC} Installer built"
echo ""

# Step 8: Generate checksums
echo -e "${BLUE}[8/8]${NC} Generating checksums..."
cd release

if command -v sha256sum &> /dev/null; then
    sha256sum *.exe *.msi 2>/dev/null > checksums.txt || true
elif command -v shasum &> /dev/null; then
    shasum -a 256 *.exe *.msi 2>/dev/null > checksums.txt || true
fi

cd ..
echo -e "${GREEN}✓${NC} Checksums generated"
echo ""

# Done!
echo "================================================"
echo -e "${GREEN}    BUILD COMPLETE!${NC}"
echo "================================================"
echo ""
echo "Output files:"
ls -lh release/*.exe release/*.msi 2>/dev/null || echo "  (No installers found)"
echo ""
echo "Checksums:"
cat release/checksums.txt 2>/dev/null || echo "  (No checksums generated)"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "  1. Test the installer on Windows"
echo "  2. Upload to GitHub releases"
echo "  3. Update documentation with download links"
echo ""
