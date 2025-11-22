# Railway deployment instructions

## Option 1: Railway (Free, No Payment Required)

### Step 1: Deploy to Railway
1. Go to https://railway.app
2. Sign up with GitHub (no payment required)
3. Click **"New Project"** → **"Deploy from GitHub repo"**
4. Select: `kshitij12345678/Order-Execution-Engine`
5. Railway will auto-detect Node.js and deploy

### Step 2: Add Database Services
1. In your Railway project dashboard:
2. Click **"+ New Service"** → **Database** → **PostgreSQL**
3. Click **"+ New Service"** → **Database** → **Redis**

### Step 3: Environment Variables (Auto-configured)
Railway automatically provides:
- `DATABASE_URL` (from PostgreSQL service)
- `REDIS_URL` (from Redis service)
- `PORT` (auto-assigned by Railway)

Your app will be live at: `https://your-app-name.railway.app`

## Option 2: Vercel (Free Alternative)

### Deploy to Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from your local directory
cd /home/kshitij/Downloads/ETERNA/order-execution-engine
vercel

# Follow prompts - it will deploy to: https://your-app.vercel.app
```

## Option 3: Heroku (Free Tier)

### Deploy to Heroku
```bash
# Install Heroku CLI and login
heroku login

# Create app
heroku create order-execution-engine-demo

# Add PostgreSQL
heroku addons:create heroku-postgresql:mini

# Add Redis
heroku addons:create heroku-redis:mini

# Deploy
git push heroku main

# Initialize database
heroku run npm run init-db
```