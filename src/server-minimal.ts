// Minimal server for Railway debugging
import fastify from 'fastify';

const server = fastify({ 
  logger: {
    level: 'info'
  }
});

// Simple health check that always works
server.get('/health', async (request, reply) => {
  return { 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'Railway deployment working'
  };
});

// Simple test endpoint
server.get('/test', async (request, reply) => {
  return { message: 'Server is running!' };
});

// Root endpoint
server.get('/', async (request, reply) => {
  return { 
    message: 'Order Execution Engine API',
    status: 'running',
    endpoints: ['/health', '/test']
  };
});

const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3000');
    const host = '0.0.0.0';  // Bind to all interfaces
    
    console.log(`Starting server on ${host}:${port}...`);
    await server.listen({ port, host });
    
    console.log(`✅ Server started successfully on http://${host}:${port}`);
    console.log(`🔍 Health check: http://${host}:${port}/health`);
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

start();