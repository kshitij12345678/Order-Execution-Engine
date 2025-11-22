// Simple public API without authentication requirements
const handler = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Simple in-memory storage for demo (no database needed)
  if (!global.orders) {
    global.orders = [];
  }

  const { method, url } = req;
  const path = url.split('?')[0];

  try {
    // Health check
    if (method === 'GET' && (path === '/health' || path === '/api/health' || path === '/')) {
      return res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        platform: 'vercel-public',
        version: '1.0.0',
        message: 'Order Execution Engine API is running'
      });
    }

    // Get all orders
    if (method === 'GET' && (path === '/orders' || path === '/api/orders')) {
      return res.json({
        orders: global.orders,
        total: global.orders.length
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
      
      // Simulate processing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const order = {
        id: orderId,
        type,
        tokenIn,
        tokenOut,
        amount: parseFloat(amount),
        status: 'completed',
        txHash: `0x${Math.random().toString(16).substr(2, 64)}`,
        executedPrice: parseFloat(amount) * (0.95 + Math.random() * 0.1),
        selectedDex: 'Jupiter',
        createdAt: new Date().toISOString(),
        executedAt: new Date().toISOString()
      };

      global.orders.push(order);

      return res.json({
        orderId: order.id,
        status: 'completed',
        txHash: order.txHash,
        executedPrice: order.executedPrice,
        selectedDex: order.selectedDex,
        message: 'Order executed successfully (demo)'
      });
    }

    // Get specific order
    if (method === 'GET' && path.match(/\/orders\/[^\/]+$/)) {
      const orderId = path.split('/').pop();
      const order = global.orders.find(o => o.id === orderId);
      
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      return res.json(order);
    }

    // API documentation
    if (method === 'GET' && path === '/docs') {
      return res.json({
        name: 'Order Execution Engine API',
        version: '1.0.0',
        status: 'online',
        baseUrl: `https://${req.headers.host}`,
        endpoints: {
          'GET /': 'API info and health check',
          'GET /health': 'Health check',
          'GET /orders': 'List all orders',
          'POST /orders/execute': 'Execute new order',
          'GET /orders/{id}': 'Get order by ID'
        },
        example: {
          execute_order: {
            url: `https://${req.headers.host}/orders/execute`,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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

    // Default response for root
    return res.json({
      message: 'Order Execution Engine API',
      status: 'running',
      endpoints: ['/health', '/orders', '/orders/execute', '/docs'],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

export default handler;