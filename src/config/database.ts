import { Pool } from 'pg';
import { createClient } from 'redis';

export const config = {
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'order_execution',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
  server: {
    port: parseInt(process.env.PORT || '3000'),
    host: process.env.HOST || 'localhost',
  }
};

// PostgreSQL connection pool
export const pool = new Pool(config.database);

// Redis connection
export const redisClient = createClient({
  socket: {
    host: config.redis.host,
    port: config.redis.port,
  }
});

// Initialize database connections
export const initializeDatabase = async () => {
  try {
    // Test PostgreSQL connection
    await pool.query('SELECT NOW()');
    console.log('PostgreSQL connected successfully');
    
    // Connect to Redis
    await redisClient.connect();
    console.log('Redis connected successfully');
    
    // Create tables if they don't exist
    await createTables();
    
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
};

// Create database tables
const createTables = async () => {
  const createOrdersTable = `
    CREATE TABLE IF NOT EXISTS orders (
      id VARCHAR(255) PRIMARY KEY,
      type VARCHAR(50) NOT NULL,
      token_in VARCHAR(100) NOT NULL,
      token_out VARCHAR(100) NOT NULL,
      amount DECIMAL(20, 8) NOT NULL,
      status VARCHAR(50) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      tx_hash VARCHAR(255),
      executed_price DECIMAL(20, 8),
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