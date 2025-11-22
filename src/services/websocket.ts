import { FastifyInstance } from 'fastify';
import { WebSocketMessage } from '../types';

export class WebSocketService {
  private connections: Map<string, any> = new Map();
  
  // Register WebSocket routes
  async register(fastify: FastifyInstance): Promise<void> {
    await fastify.register(require('@fastify/websocket'));
    
    // WebSocket endpoint for order status updates
    fastify.register(async (fastify: any) => {
      fastify.get('/ws/:orderId', { websocket: true }, (connection: any, req: any) => {
        const orderId = req.params.orderId;
        
        // Store connection for this order
        this.connections.set(orderId, connection.socket);
        
        connection.socket.on('message', (message: any) => {
          console.log(`Message from ${orderId}:`, message.toString());
        });
        
        connection.socket.on('close', () => {
          this.connections.delete(orderId);
          console.log(`WebSocket closed for order ${orderId}`);
        });
        
        connection.socket.on('error', (error: any) => {
          console.error(`WebSocket error for order ${orderId}:`, error);
          this.connections.delete(orderId);
        });
        
        // Send initial connection confirmation
        connection.socket.send(JSON.stringify({
          type: 'connected',
          orderId,
          timestamp: new Date()
        }));
      });
    });
  }
  
  // Broadcast message to specific order WebSocket
  broadcastToOrder(orderId: string, message: WebSocketMessage): void {
    const connection = this.connections.get(orderId);
    if (connection && connection.readyState === 1) { // WebSocket.OPEN
      try {
        connection.send(JSON.stringify(message));
      } catch (error) {
        console.error(`Failed to send message to ${orderId}:`, error);
        this.connections.delete(orderId);
      }
    }
  }
  
  // Broadcast to all connected clients
  broadcastToAll(message: any): void {
    this.connections.forEach((connection, orderId) => {
      if (connection.readyState === 1) {
        try {
          connection.send(JSON.stringify(message));
        } catch (error) {
          console.error(`Failed to broadcast to ${orderId}:`, error);
          this.connections.delete(orderId);
        }
      }
    });
  }
  
  // Get connection count
  getConnectionCount(): number {
    return this.connections.size;
  }
  
  // Get active order IDs
  getActiveOrders(): string[] {
    return Array.from(this.connections.keys());
  }
  
  // Create status callback function for order processor
  createStatusCallback = (orderId: string) => {
    return (message: WebSocketMessage) => {
      this.broadcastToOrder(orderId, message);
    };
  };
  
  // Clean up closed connections
  cleanup(): void {
    this.connections.forEach((connection, orderId) => {
      if (connection.readyState !== 1) {
        this.connections.delete(orderId);
      }
    });
  }
}