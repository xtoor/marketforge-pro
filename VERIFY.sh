#!/bin/bash
# Verification script to check project integrity

echo "🔍 MarketForge-Pro Project Verification"
echo "========================================"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1"
        return 0
    else
        echo -e "${RED}✗${NC} $1 (MISSING)"
        return 1
    fi
}

check_dir() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✓${NC} $1/"
        return 0
    else
        echo -e "${RED}✗${NC} $1/ (MISSING)"
        return 1
    fi
}

missing=0

echo "📁 Directory Structure"
echo "---------------------"
check_dir "backend" || ((missing++))
check_dir "backend/api" || ((missing++))
check_dir "backend/bridges" || ((missing++))
check_dir "backend/models" || ((missing++))
check_dir "backend/tests" || ((missing++))
check_dir "frontend" || ((missing++))
check_dir "frontend/src" || ((missing++))
check_dir "frontend/src/components" || ((missing++))
check_dir "frontend/src/hooks" || ((missing++))
check_dir "docs" || ((missing++))
check_dir "scripts" || ((missing++))
echo ""

echo "📄 Backend Files"
echo "---------------"
check_file "backend/api/main.py" || ((missing++))
check_file "backend/api/config.py" || ((missing++))
check_file "backend/api/broker_endpoints.py" || ((missing++))
check_file "backend/api/chart_data.py" || ((missing++))
check_file "backend/bridges/resonance_bridge.py" || ((missing++))
check_file "backend/bridges/tradingview_bridge.py" || ((missing++))
check_file "backend/models/market_data.py" || ((missing++))
check_file "backend/requirements.txt" || ((missing++))
echo ""

echo "📄 Frontend Files"
echo "----------------"
check_file "frontend/src/App.tsx" || ((missing++))
check_file "frontend/src/components/TradingChart.tsx" || ((missing++))
check_file "frontend/src/components/ChartControls.tsx" || ((missing++))
check_file "frontend/src/hooks/useChartData.ts" || ((missing++))
check_file "frontend/index.html" || ((missing++))
check_file "package.json" || ((missing++))
check_file "tsconfig.json" || ((missing++))
check_file "vite.config.ts" || ((missing++))
echo ""

echo "📄 Test Files"
echo "------------"
check_file "backend/tests/test_broker_endpoints.py" || ((missing++))
check_file "backend/tests/test_resonance_bridge.py" || ((missing++))
check_file "backend/tests/test_chart_data.py" || ((missing++))
check_file "pytest.ini" || ((missing++))
echo ""

echo "📄 Documentation"
echo "---------------"
check_file "README.md" || ((missing++))
check_file "QUICKSTART.md" || ((missing++))
check_file "INTEGRATION_REPORT.md" || ((missing++))
check_file "docs/INTEGRATION_GUIDE.md" || ((missing++))
check_file "docs/ARCHITECTURE.md" || ((missing++))
echo ""

echo "📄 Configuration"
echo "---------------"
check_file ".env.example" || ((missing++))
check_file ".gitignore" || ((missing++))
check_file ".gitmodules" || ((missing++))
echo ""

echo "📄 Scripts"
echo "---------"
check_file "scripts/setup.sh" || ((missing++))
check_file "scripts/test_schema.py" || ((missing++))
echo ""

echo "========================================"
if [ $missing -eq 0 ]; then
    echo -e "${GREEN}✅ All files present!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Run: bash scripts/setup.sh"
    echo "  2. Edit: .env (add API keys if needed)"
    echo "  3. Start: npm run start:backend && npm run start:frontend"
    echo "  4. Visit: http://localhost:3000"
else
    echo -e "${RED}❌ $missing file(s)/directory(ies) missing${NC}"
    echo ""
    echo "Please review the output above to see what's missing."
    exit 1
fi

echo ""
echo "📊 Project Statistics"
echo "--------------------"
echo "Backend files: $(find backend -name '*.py' | wc -l)"
echo "Frontend files: $(find frontend -name '*.tsx' -o -name '*.ts' | wc -l)"
echo "Test files: $(find backend/tests -name '*.py' | wc -l)"
echo "Documentation: $(find . -name '*.md' | wc -l)"
echo ""
echo "Total lines of code:"
find backend frontend -name '*.py' -o -name '*.tsx' -o -name '*.ts' | xargs wc -l | tail -1
