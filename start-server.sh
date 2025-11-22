#!/bin/bash
cd /home/kshitij/Downloads/ETERNA/order-execution-engine
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=orderdb
export DB_USER=orderuser
export DB_PASSWORD=orderpass
export REDIS_HOST=localhost
export REDIS_PORT=6379
export PORT=3000
export HOST=localhost
export NODE_ENV=development

echo "Starting Order Execution Engine..."
echo "Database: $DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"
echo "Redis: $REDIS_HOST:$REDIS_PORT"
echo "Server: $HOST:$PORT"
echo ""

npm run dev