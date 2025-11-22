import fastify from 'fastify';
import cors from '@fastify/cors';
import { initializeDatabase } from './config/database';
import { OrderProcessor } from './services/orderQueue';
import { WebSocketService } from './services/websocket';
import { orderRoutes } from './routes/orders';

const server = fastify({ 
  logger: {
    level: 'info'
  }
});

// Global services
let orderProcessor: OrderProcessor;
let wsService: WebSocketService;

// Register plugins and middleware
const setupServer = async () => {
  // CORS configuration
  await server.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  });

  // WebSocket service setup
  wsService = new WebSocketService();
  await wsService.register(server);

  // Health check endpoint
  server.get('/health', async (request, reply) => {
    const queueStats = orderProcessor ? await orderProcessor.getQueueStats() : null;
    const wsConnections = wsService ? wsService.getConnectionCount() : 0;
    
    return { 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        queue: queueStats,
        websockets: wsConnections
      }
    };
  });

  // Register order routes
  server.register(async function (fastify) {
    await orderRoutes(fastify, orderProcessor, wsService);
  });

  // Error handling
  server.setErrorHandler((error, request, reply) => {
    server.log.error(error);
    reply.status(500).send({
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : error.message
    });
  });

  // 404 handler
  server.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      error: 'Not Found',
      message: `Route ${request.method} ${request.url} not found`
    });
  });
};

// Graceful shutdown
const gracefulShutdown = async () => {
  console.log('Shutting down gracefully...');
  
  if (orderProcessor) {
    await orderProcessor.shutdown();
  }
  
  await server.close();
  process.exit(0);
};

// Handle shutdown signals
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// Start server
const start = async () => {
  try {
    // Initialize database connections
    console.log('Initializing database connections...');
    await initializeDatabase();
    
    // Initialize order processor
    console.log('Starting order processor...');
    orderProcessor = new OrderProcessor();
    
    // Setup server middleware and routes
    await setupServer();
    
    // Start server
    const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
    const host = process.env.HOST || 'localhost';
    
    await server.listen({ port, host });
    
    console.log(`🚀 Order Execution Engine started on http://${host}:${port}`);
    console.log(`📊 Health check: http://${host}:${port}/health`);
    console.log(`📡 WebSocket: ws://${host}:${port}/ws/:orderId`);
    console.log(`🔥 Submit orders: POST http://${host}:${port}/api/orders/execute`);
    
  } catch (error) {
    server.log.error(error);
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

start();