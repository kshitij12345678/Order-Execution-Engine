#!/bin/bash

# Free deployment script - tries multiple platforms
echo "🚀 Deploying Order Execution Engine to free hosting..."

# Check if Railway CLI is installed
if command -v railway &> /dev/null; then
    echo "📡 Deploying to Railway..."
    railway login
    railway link
    railway up --detach
    railway add -d postgresql
    railway add -d redis
    echo "✅ Deployed to Railway!"
    railway status
    exit 0
fi

# Check if Vercel CLI is installed  
if command -v vercel &> /dev/null; then
    echo "📡 Deploying to Vercel..."
    vercel --prod
    echo "✅ Deployed to Vercel!"
    exit 0
fi

# Check if Heroku CLI is installed
if command -v heroku &> /dev/null; then
    echo "📡 Deploying to Heroku..."
    heroku create order-execution-engine-$(date +%s)
    heroku addons:create heroku-postgresql:mini
    heroku addons:create heroku-redis:mini
    git push heroku main
    heroku run ./scripts/init-db.sh
    echo "✅ Deployed to Heroku!"
    heroku open
    exit 0
fi

# Fallback to Docker instructions
echo "❌ No deployment CLI found."
echo "📋 Install one of these for free deployment:"
echo "   • Railway: npm i -g @railway/cli"
echo "   • Vercel:  npm i -g vercel" 
echo "   • Heroku:  https://devcenter.heroku.com/articles/heroku-cli"
echo ""
echo "Or use Docker:"
echo "   docker build -t order-engine ."
echo "   docker run -p 3000:3000 order-engine"