#!/bin/bash
#
# MarketForge Pro - Development Server Launcher
# Starts both backend (FastAPI) and frontend (Vite) servers
#

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "Starting MarketForge Pro from: $SCRIPT_DIR"

# Kill any existing processes
echo "Stopping existing servers..."
pkill -9 -f "uvicorn.*8000" 2>/dev/null
pkill -9 -f "vite.*3000" 2>/dev/null
sleep 2

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found. Please run setup.sh first."
    exit 1
fi

# Start backend
echo "Starting backend server..."
source venv/bin/activate
uvicorn backend.api.main:app --host 0.0.0.0 --port 8000 --reload > /tmp/marketforge-backend.log 2>&1 &
BACKEND_PID=$!

# Start frontend
echo "Starting frontend server..."
npm run dev -- --host 0.0.0.0 > /tmp/marketforge-frontend.log 2>&1 &
FRONTEND_PID=$!

sleep 5

# Get local IP address
if command -v hostname &> /dev/null; then
    LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
    if [ -z "$LOCAL_IP" ]; then
        LOCAL_IP="localhost"
    fi
else
    LOCAL_IP="localhost"
fi

echo ""
echo "================================================"
echo "     MARKETFORGE PRO - SERVERS STARTED"
echo "================================================"
echo ""
echo "Backend PID: $BACKEND_PID (port 8000)"
echo "Frontend PID: $FRONTEND_PID (port 3000)"
echo ""
echo "Access the app at:"
echo "  • http://localhost:3000"
if [ "$LOCAL_IP" != "localhost" ]; then
    echo "  • http://$LOCAL_IP:3000"
fi
echo ""
echo "Backend API Documentation:"
echo "  • http://localhost:8000/docs"
echo ""
echo "Logs:"
echo "  • Backend:  tail -f /tmp/marketforge-backend.log"
echo "  • Frontend: tail -f /tmp/marketforge-frontend.log"
echo ""
echo "To stop servers:"
echo "  • pkill -f uvicorn"
echo "  • pkill -f vite"
echo "================================================"
echo ""

# Check if services are running
sleep 2
echo "Health Check:"
curl -s http://localhost:8000/api/health >/dev/null && echo "  ✓ Backend is healthy" || echo "  ✗ Backend failed to start"
curl -s http://localhost:3000 >/dev/null && echo "  ✓ Frontend is running" || echo "  ✗ Frontend failed to start"
echo ""
