#!/usr/bin/env bash
# PRAMAAN Unified Multi-Service Launcher for Linux/macOS
# Launches all 4 microservices:
#   1. Backend         - Port 5000 (npm run dev)
#   2. AI Service       - Port 8000 (ai-services/.venv/bin/python server.py)
#   3. Desktop Frontend - Port 5173 (npm run dev)
#   4. Mobile Web       - Port 5174 (npm run dev)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "================================================================="
echo "          PRAMAAN: Unified Multi-Service Launcher               "
echo "================================================================="
echo "  Project Root: $SCRIPT_DIR"
echo ""

# Find python in virtual environment or fallback to system python
if [ -f "$SCRIPT_DIR/ai-services/.venv/bin/python" ]; then
    PYTHON_BIN="$SCRIPT_DIR/ai-services/.venv/bin/python"
elif [ -f "$SCRIPT_DIR/.venv/bin/python" ]; then
    PYTHON_BIN="$SCRIPT_DIR/.venv/bin/python"
else
    PYTHON_BIN="$(which python3 || which python)"
fi

pids=()

cleanup() {
    echo ""
    echo "[!] Stopping all PRAMAAN services..."
    for pid in "${pids[@]}"; do
        if kill -0 "$pid" 2>/dev/null; then
            kill "$pid" 2>/dev/null || true
        fi
    done
    wait 2>/dev/null
    echo "[✓] All services stopped."
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# 1. Start Backend (Port 5000)
echo "[1/4] Starting Backend (Port 5000)..."
(cd backend && npm run dev) &
pids+=($!)

# 2. Start AI Service (Port 8000)
echo "[2/4] Starting AI Service (Port 8000)..."
(cd ai-services && "$PYTHON_BIN" server.py) &
pids+=($!)

# Brief pause before frontends
sleep 2

# 3. Start Desktop Frontend (Port 5173)
echo "[3/4] Starting Desktop Frontend (Port 5173)..."
(cd frontend && npm run dev) &
pids+=($!)

# 4. Start Mobile Web (Port 5174)
echo "[4/4] Starting Mobile Web Companion (Port 5174)..."
(cd mobile-web && npm run dev) &
pids+=($!)

echo ""
echo "================================================================="
echo "  All 4 PRAMAAN services started!"
echo "  - Backend API:       http://localhost:5000"
echo "  - AI Services API:   http://localhost:8000"
echo "  - Desktop Console:   http://localhost:5173"
echo "  - Mobile Companion:  http://localhost:5174"
echo "================================================================="
echo "Press Ctrl+C to stop all services."
echo ""

wait
