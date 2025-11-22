// Vercel Serverless API - Order Execution Engine
// Public deployment ready with Neon Database integration

const { Pool } = require('pg');

// Initialize database connection
let pool;

const initDB = () => {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL || 
      'postgresql://neondb_owner:neondb_password@ep-host.us-east-1.aws.neon.tech/neondb?sslmode=require';
    
    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false }
    });
  }
  return pool;
};

// Create tables if they don't exist
const createTables = async () => {
  const db = initDB();
  
  try {
    await db.query(`
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
    `);
    
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
      CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
    `);
  } catch (error) {
    console.log('Table creation skipped (may already exist):', error.message);
  }
};

// Mock DEX execution for demo
const executeOrder = async (orderData) => {
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
  
  // Mock execution results
  const mockDEXes = ['Jupiter', 'Raydium', '1inch', 'Orca'];
  const selectedDex = mockDEXes[Math.floor(Math.random() * mockDEXes.length)];
  const slippage = 0.95 + Math.random() * 0.1; // 5% max slippage
  
  return {
    txHash: `0x${Math.random().toString(16).substr(2, 64)}`,
    executedPrice: parseFloat(orderData.amount) * slippage,
    selectedDex,
    gasUsed: Math.floor(50000 + Math.random() * 100000),
    executedAt: new Date().toISOString()
  };
};

// Main API handler
module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Initialize database on first request
  await createTables();

  const { method, url, query } = req;
  const path = url.split('?')[0];

  try {
    // Health check
    if (method === 'GET' && (path === '/health' || path === '/api/health')) {
      const db = initDB();
      await db.query('SELECT NOW()');  // Test DB connection
      
      return res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        platform: 'vercel-serverless',
        database: 'connected',
        version: '1.0.0'
      });
    }

    // Get all orders
    if (method === 'GET' && (path === '/orders' || path === '/api/orders')) {
      const db = initDB();
      const limit = query.limit ? parseInt(query.limit) : 50;
      const offset = query.offset ? parseInt(query.offset) : 0;
      
      const result = await db.query(
        'SELECT * FROM orders ORDER BY created_at DESC LIMIT $1 OFFSET $2',
        [limit, offset]
      );
      
      return res.json({
        orders: result.rows,
        total: result.rows.length,
        limit,
        offset
      });
    }

    // Execute new order
    if (method === 'POST' && (path === '/orders/execute' || path === '/api/orders/execute')) {
      const { type, tokenIn, tokenOut, amount } = req.body;
      
      if (!type || !tokenIn || !tokenOut || !amount) {
        return res.status(400).json({ 
          error: 'Missing required fields',
          required: ['type', 'tokenIn', 'tokenOut', 'amount']
        });
      }

      const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const db = initDB();
      
      // Insert pending order
      await db.query(
        'INSERT INTO orders (id, type, token_in, token_out, amount, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [orderId, type, tokenIn, tokenOut, parseFloat(amount), 'pending', new Date()]
      );

      // Execute order
      try {
        const execution = await executeOrder({ type, tokenIn, tokenOut, amount });
        
        // Update order with results
        await db.query(
          'UPDATE orders SET status = $1, tx_hash = $2, executed_price = $3, selected_dex = $4, updated_at = $5 WHERE id = $6',
          ['completed', execution.txHash, execution.executedPrice, execution.selectedDex, new Date(), orderId]
        );

        return res.json({
          orderId,
          status: 'completed',
          txHash: execution.txHash,
          executedPrice: execution.executedPrice,
          selectedDex: execution.selectedDex,
          gasUsed: execution.gasUsed,
          executedAt: execution.executedAt,
          message: 'Order executed successfully'
        });

      } catch (error) {
        // Mark order as failed
        await db.query(
          'UPDATE orders SET status = $1, error = $2, updated_at = $3 WHERE id = $4',
          ['failed', error.message, new Date(), orderId]
        );

        return res.status(500).json({
          orderId,
          status: 'failed',
          error: error.message
        });
      }
    }

    // Get specific order
    if (method === 'GET' && path.match(/\/orders\/[^\/]+$/)) {
      const orderId = path.split('/').pop();
      const db = initDB();
      
      const result = await db.query('SELECT * FROM orders WHERE id = $1', [orderId]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Order not found' });
      }

      return res.json(result.rows[0]);
    }

    // API documentation
    if (method === 'GET' && path === '/') {
      return res.json({
        name: 'Order Execution Engine API',
        version: '1.0.0',
        status: 'online',
        endpoints: {
          'GET /health': 'Health check',
          'GET /orders': 'List all orders',
          'POST /orders/execute': 'Execute new order',
          'GET /orders/{id}': 'Get order by ID'
        },
        example: {
          execute_order: {
            url: `${req.headers.host}/orders/execute`,
            method: 'POST',
            body: {
              type: 'market',
              tokenIn: 'SOL',
              tokenOut: 'USDC',
              amount: '1.0'
            }
          }
        }
      });
    }

    // 404 for unknown routes
    return res.status(404).json({ 
      error: 'Route not found',
      available_routes: ['/health', '/orders', '/orders/execute', '/orders/{id}']
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : error.message,
      timestamp: new Date().toISOString()
    });
  }
};