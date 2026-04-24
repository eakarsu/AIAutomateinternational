#!/bin/bash

# ============================================================
# AIAutomate International - Money Transfer Platform
# Start Script - Cleans ports, seeds database, starts services
# ============================================================

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_PORT=3001
FRONTEND_PORT=3000

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║     AIAutomate International - Money Transfer Platform    ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# ---- Step 1: Clean up ports ----
echo "🔧 Step 1: Cleaning up ports $BACKEND_PORT and $FRONTEND_PORT..."

cleanup_port() {
  local port=$1
  local pids=$(lsof -ti :$port 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo "   Killing processes on port $port: $pids"
    echo "$pids" | xargs kill -9 2>/dev/null || true
    sleep 1
  else
    echo "   Port $port is free"
  fi
}

cleanup_port $BACKEND_PORT
cleanup_port $FRONTEND_PORT
echo ""

# ---- Step 2: Check PostgreSQL ----
echo "🐘 Step 2: Checking PostgreSQL..."
if command -v pg_isready &> /dev/null; then
  if pg_isready -q 2>/dev/null; then
    echo "   PostgreSQL is running"
  else
    echo "   Starting PostgreSQL..."
    if command -v brew &> /dev/null; then
      brew services start postgresql@14 2>/dev/null || brew services start postgresql 2>/dev/null || true
    fi
    sleep 2
  fi
else
  echo "   pg_isready not found, assuming PostgreSQL is running"
fi

# ---- Step 3: Create database if not exists ----
echo ""
echo "🗄️  Step 3: Setting up database..."
DB_NAME="aiautomateintl"
if psql -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw $DB_NAME; then
  echo "   Database '$DB_NAME' already exists"
else
  echo "   Creating database '$DB_NAME'..."
  createdb $DB_NAME 2>/dev/null || psql -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || echo "   Database may already exist"
fi
echo ""

# ---- Step 4: Install dependencies ----
echo "📦 Step 4: Installing dependencies..."
echo "   Installing backend dependencies..."
cd "$PROJECT_DIR/backend"
npm install --silent 2>&1 | tail -1
echo "   Installing frontend dependencies..."
cd "$PROJECT_DIR/frontend"
npm install --silent 2>&1 | tail -1
echo ""

# ---- Step 5: Seed database ----
echo "🌱 Step 5: Seeding database with sample data..."
cd "$PROJECT_DIR/backend"
node seed.js
echo ""

# ---- Step 6: Start backend with hot reload ----
echo "🚀 Step 6: Starting services..."
echo "   Starting backend on port $BACKEND_PORT (with nodemon for hot reload)..."
cd "$PROJECT_DIR/backend"
npx nodemon server.js &
BACKEND_PID=$!
sleep 2

# ---- Step 7: Start frontend with hot reload ----
echo "   Starting frontend on port $FRONTEND_PORT (with React hot reload)..."
cd "$PROJECT_DIR/frontend"
BROWSER=none PORT=$FRONTEND_PORT npm start &
FRONTEND_PID=$!

# ---- Cleanup handler ----
cleanup() {
  echo ""
  echo "🛑 Shutting down services..."
  kill $BACKEND_PID 2>/dev/null || true
  kill $FRONTEND_PID 2>/dev/null || true
  cleanup_port $BACKEND_PORT
  cleanup_port $FRONTEND_PORT
  echo "   Services stopped. Goodbye!"
  exit 0
}

trap cleanup SIGINT SIGTERM

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  ✅ AIAutomate International is running!                  ║"
echo "║                                                          ║"
echo "║  Frontend:  http://localhost:$FRONTEND_PORT                     ║"
echo "║  Backend:   http://localhost:$BACKEND_PORT                     ║"
echo "║                                                          ║"
echo "║  Demo Login:                                             ║"
echo "║    Email:    demo@aiautomateintl.com                     ║"
echo "║    Password: password123                                 ║"
echo "║                                                          ║"
echo "║  Press Ctrl+C to stop all services                       ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Wait for both processes
wait
