#!/bin/bash

# Render deployment setup script
echo "🚀 Setting up Order Execution Engine on Render..."

# 1. Create PostgreSQL database
echo "📊 Creating PostgreSQL database..."
curl -X POST "https://api.render.com/v1/services" \
  -H "Authorization: Bearer $RENDER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "pserv",
    "name": "order-db",
    "env": "postgresql",
    "plan": "free",
    "region": "oregon"
  }'

# 2. Create Redis instance  
echo "📊 Creating Redis instance..."
curl -X POST "https://api.render.com/v1/services" \
  -H "Authorization: Bearer $RENDER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "redis", 
    "name": "order-redis",
    "plan": "free",
    "region": "oregon"
  }'

echo "✅ Database services created. Please add DATABASE_URL and REDIS_URL env vars manually in Render dashboard."