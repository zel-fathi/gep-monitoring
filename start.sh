#!/bin/bash

echo "🔧 Starting Microgrid Energy Monitoring App..."

# Create .env from .env.example (overwrite existing)
echo "📋 Creating/updating .env from .env.example..."
cp .env.example .env

# Verify .env file exists and contains required variables
if [ ! -f ".env" ]; then
    echo "❌ Failed to create .env file"
    exit 1
fi

echo "📋 Environment variables loaded:"
grep -v "^#" .env | head -5

# Stop any existing services
echo "🛑 Stopping existing services..."
docker compose down || true

# Remove any existing volumes to ensure clean state
echo "🧹 Cleaning up existing volumes..."
docker compose down -v || true

# Install frontend dependencies before building services
echo "📦 Installing frontend dependencies (first run may take a while)..."
(cd frontend && npm install)

# Build and start all services
echo "🚀 Building and starting services..."
docker compose up -d --build

# Wait a moment for services to start
echo "⏳ Waiting for services to initialize..."
sleep 15

echo ""
echo "✅ Services are starting! Access points:"
echo "   🌐 Frontend: http://localhost/"
echo "   📊 pgAdmin: http://localhost:5050"
echo "   🔑 Default login: admin / admin123"
echo "   📑 API docs: http://localhost/api/openapi.yaml"
echo ""
echo "📝 Check service status with: docker compose ps"
echo "📋 View logs with: docker compose logs -f [service]"

# Show service status
echo ""
echo "📊 Current service status:"
docker compose ps
