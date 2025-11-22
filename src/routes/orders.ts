import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { OrderModel } from '../models/Order';
import { OrderProcessor } from '../services/orderQueue';
import { WebSocketService } from '../services/websocket';
import { OrderRequest, OrderType, OrderStatus } from '../types';
import { v4 as uuidv4 } from 'uuid';

export async function orderRoutes(fastify: FastifyInstance, orderProcessor: OrderProcessor, wsService: WebSocketService) {
  
  // Execute order endpoint
  fastify.post('/api/orders/execute', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const orderRequest = request.body as OrderRequest;
      
      // Validate request
      if (!orderRequest.tokenIn || !orderRequest.tokenOut || !orderRequest.amount) {
        return reply.status(400).send({
          error: 'Missing required fields: tokenIn, tokenOut, amount'
        });
      }
      
      if (orderRequest.amount <= 0) {
        return reply.status(400).send({
          error: 'Amount must be greater than 0'
        });
      }
      
      // Generate unique order ID
      const orderId = `order_${Date.now()}_${uuidv4().slice(0, 8)}`;
      
      // Create order object
      const order = {
        id: orderId,
        type: orderRequest.type || OrderType.MARKET,
        tokenIn: orderRequest.tokenIn,
        tokenOut: orderRequest.tokenOut,
        amount: orderRequest.amount,
        status: OrderStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Save order to database
      await OrderModel.create(order);
      
      // Create WebSocket status callback
      const statusCallback = wsService.createStatusCallback(orderId);
      
      // Add order to processing queue
      await orderProcessor.addOrder(order, statusCallback);
      
      console.log(`Order ${orderId} submitted for execution`);
      
      // Return order ID immediately
      return reply.status(201).send({
        orderId,
        status: 'accepted',
        message: 'Order submitted for execution',
        websocketUrl: `/ws/${orderId}`
      });
      
    } catch (error) {
      console.error('Order execution error:', error);
      return reply.status(500).send({
        error: 'Internal server error',
        message: (error as Error).message
      });
    }
  });
  
  // Get order status
  fastify.get('/api/orders/:orderId', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { orderId } = request.params as { orderId: string };
      
      // Try to get from active orders first (Redis)
      let order = await OrderModel.getActiveOrder(orderId);
      
      // If not in active orders, get from database
      if (!order) {
        order = await OrderModel.findById(orderId);
      }
      
      if (!order) {
        return reply.status(404).send({
          error: 'Order not found'
        });
      }
      
      return reply.send(order);
      
    } catch (error) {
      console.error('Get order error:', error);
      return reply.status(500).send({
        error: 'Internal server error',
        message: (error as Error).message
      });
    }
  });
  
  // Get queue statistics
  fastify.get('/api/orders/stats', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const queueStats = await orderProcessor.getQueueStats();
      const wsConnections = wsService.getConnectionCount();
      const activeOrders = wsService.getActiveOrders();
      
      return reply.send({
        queue: queueStats,
        websockets: {
          connections: wsConnections,
          activeOrders
        },
        timestamp: new Date()
      });
      
    } catch (error) {
      console.error('Stats error:', error);
      return reply.status(500).send({
        error: 'Internal server error',
        message: (error as Error).message
      });
    }
  });
  
  // Get recent orders
  fastify.get('/api/orders', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = request.query as { status?: OrderStatus; limit?: string };
      const limit = parseInt(query.limit || '50');
      
      let orders;
      if (query.status) {
        orders = await OrderModel.findByStatus(query.status);
      } else {
        // Get recent orders (you might want to implement this method)
        orders = await OrderModel.findByStatus(OrderStatus.CONFIRMED);
      }
      
      // Limit results
      const limitedOrders = orders.slice(0, limit);
      
      return reply.send({
        orders: limitedOrders,
        count: limitedOrders.length,
        timestamp: new Date()
      });
      
    } catch (error) {
      console.error('Get orders error:', error);
      return reply.status(500).send({
        error: 'Internal server error',
        message: (error as Error).message
      });
    }
  });
}