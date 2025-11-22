import { Pool } from 'pg';
import { createClient } from 'redis';

// Railway expects DATABASE_URL and REDIS_URL to be provided to the service.
// In production we require DATABASE_URL; in development we keep the local fallback.
const isProduction = process.env.NODE_ENV === 'production';

const getDatabaseConfig = () => {
  if (process.env.DATABASE_URL) {
    return { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } };
  }

  if (isProduction) {
    // In production we require DATABASE_URL to avoid accidental localhost fallbacks.
    throw new Error('DATABASE_URL is required in production. Please set the Railway DATABASE_URL.');
  }

  // Development fallback
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'orderdb',
    user: process.env.DB_USER || 'orderuser',
    password: process.env.DB_PASSWORD || 'orderpass',
  };
};

const getRedisConfig = () => {
  if (process.env.REDIS_URL) {
    return { url: process.env.REDIS_URL };
  }

  if (isProduction) {
    console.warn('REDIS_URL not set in production - Redis features will be disabled');
    return null;
  }

  // Development fallback
  return {
    socket: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    }
  };
};

export const config = {
  database: getDatabaseConfig(),
  redis: getRedisConfig(),
  server: {
    port: parseInt(process.env.PORT || '3000'),
    host: process.env.HOST || '0.0.0.0',
  }
};

// PostgreSQL pool (safe: only create if config present)
export const pool = new Pool(config.database as any);

// Redis client may be null when not configured
export const redisClient = config.redis ? createClient(config.redis as any) : null;

// Initialize database connections
export const initializeDatabase = async () => {
  try {
    // Test PostgreSQL connection
    await pool.query('SELECT NOW()');
    console.log('PostgreSQL connected successfully');

    // Connect to Redis if configured
    if (redisClient) {
      await redisClient.connect();
      console.log('Redis connected successfully');
    } else {
      console.log('Redis not configured, skipping connection');
    }

    // Create tables if they don't exist
    await createTables();

  } catch (error) {
    console.error('Database initialization failed:', error);
    if (isProduction) {
      // Crash in production so Railway can restart or surface the error
      throw error;
    } else {
      console.warn('Continuing without database connection (development)');
    }
  }
};

// Create database tables
const createTables = async () => {
  const createOrdersTable = `
    CREATE TABLE IF NOT EXISTS orders (
      id VARCHAR(255) PRIMARY KEY,
      type VARCHAR(50),
      token_in VARCHAR(100),
      token_out VARCHAR(100),
      amount DECIMAL(20,8),
      status VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      tx_hash VARCHAR(255),
      executed_price DECIMAL(20,8),
      selected_dex VARCHAR(50),
      error TEXT
    );
  `;

  const createIndexes = `
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
  `;

  await pool.query(createOrdersTable);
  await pool.query(createIndexes);
  console.log('Database tables created successfully');
};