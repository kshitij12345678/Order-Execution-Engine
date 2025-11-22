#!/bin/bash

# Database initialization script for Render
# This will be run once after deployment to set up the database schema

echo "🗄️  Initializing database schema..."

if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL not found. Using local database configuration."
    export PGPASSWORD=${DB_PASSWORD:-orderpass}
    psql -h ${DB_HOST:-localhost} -p ${DB_PORT:-5432} -U ${DB_USER:-orderuser} -d ${DB_NAME:-orderdb} -f database/schema.sql
else
    echo "✅ Using DATABASE_URL for schema initialization"
    psql "$DATABASE_URL" -f database/schema.sql
fi

echo "✅ Database schema initialized successfully!"