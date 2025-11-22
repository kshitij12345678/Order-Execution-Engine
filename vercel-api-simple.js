// Vercel Serverless API - Simplified Order Execution
// This removes WebSockets and background queues for Vercel compatibility

const { Pool } = require('pg');

// Database connection for Vercel
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Mock DEX Router for demo
const mockExecuteOrder = async (order) => {
  // Simulate order execution delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return {
    txHash: `0x${Math.random().toString(16).substr(2, 64)}`,
    executedPrice: parseFloat(order.amount) * (0.95 + Math.random() * 0.1),
    selectedDex: 'Jupiter'
  };
};

// Main API handler
module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { method, url } = req;

  try {
    // Health check
    if (method === 'GET' && url === '/api/health') {
      return res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        platform: 'vercel-serverless'
      });
    }

    // Execute order
    if (method === 'POST' && url === '/api/orders/execute') {
      const { type, tokenIn, tokenOut, amount } = req.body;
      
      if (!type || !tokenIn || !tokenOut || !amount) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create order in database
      const order = {
        id: orderId,
        type,
        token_in: tokenIn,
        token_out: tokenOut,
        amount: parseFloat(amount),
        status: 'pending',
        created_at: new Date()
      };

      // Insert into database
      await pool.query(
        'INSERT INTO orders (id, type, token_in, token_out, amount, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [order.id, order.type, order.token_in, order.token_out, order.amount, order.status, order.created_at]
      );

      // Execute order (simplified)
      const execution = await mockExecuteOrder(order);
      
      // Update order status
      await pool.query(
        'UPDATE orders SET status = $1, tx_hash = $2, executed_price = $3, selected_dex = $4, updated_at = $5 WHERE id = $6',
        ['completed', execution.txHash, execution.executedPrice, execution.selectedDex, new Date(), orderId]
      );

      return res.json({
        orderId,
        status: 'completed',
        ...execution
      });
    }

    // Get order status
    if (method === 'GET' && url.startsWith('/api/orders/')) {
      const orderId = url.split('/').pop();
      const result = await pool.query('SELECT * FROM orders WHERE id = $1', [orderId]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Order not found' });
      }

      return res.json(result.rows[0]);
    }

    // 404 for other routes
    return res.status(404).json({ error: 'Route not found' });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : error.message
    });
  }
};