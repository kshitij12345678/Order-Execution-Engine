import { WebSocketService } from '../services/websocket';
import { OrderStatus, WebSocketMessage, DexType } from '../types';

// Mock Fastify WebSocket
jest.mock('@fastify/websocket', () => ({}));

describe('WebSocket Service', () => {
  let wsService: WebSocketService;
  let mockSocket: any;
  let mockConnection: any;

  beforeEach(() => {
    wsService = new WebSocketService();
    
    // Mock WebSocket connection
    mockSocket = {
      send: jest.fn(),
      readyState: 1, // WebSocket.OPEN
      on: jest.fn(),
      close: jest.fn()
    };

    mockConnection = {
      socket: mockSocket
    };

    // Manually add connection to test broadcast functionality
    (wsService as any).connections.set('test-order-123', mockSocket);
  });

  test('should create WebSocket service instance', () => {
    expect(wsService).toBeDefined();
    expect(typeof wsService.broadcastToOrder).toBe('function');
    expect(typeof wsService.createStatusCallback).toBe('function');
  });

  test('should get connection count', () => {
    const count = wsService.getConnectionCount();
    expect(count).toBe(1); // We added one connection manually
  });

  test('should get active order IDs', () => {
    const orders = wsService.getActiveOrders();
    expect(orders).toContain('test-order-123');
    expect(orders.length).toBe(1);
  });

  test('should broadcast message to specific order', () => {
    const message: WebSocketMessage = {
      orderId: 'test-order-123',
      status: OrderStatus.ROUTING,
      timestamp: new Date(),
      data: { selectedDex: DexType.RAYDIUM }
    };

    wsService.broadcastToOrder('test-order-123', message);

    expect(mockSocket.send).toHaveBeenCalledWith(JSON.stringify(message));
  });

  test('should not broadcast to non-existent order', () => {
    const message: WebSocketMessage = {
      orderId: 'non-existent',
      status: OrderStatus.ROUTING,
      timestamp: new Date()
    };

    wsService.broadcastToOrder('non-existent', message);

    expect(mockSocket.send).not.toHaveBeenCalled();
  });

  test('should handle socket send errors gracefully', () => {
    mockSocket.send.mockImplementation(() => {
      throw new Error('Connection closed');
    });

    const message: WebSocketMessage = {
      orderId: 'test-order-123',
      status: OrderStatus.FAILED,
      timestamp: new Date(),
      data: { error: 'Network error' }
    };

    // Should not throw error
    expect(() => {
      wsService.broadcastToOrder('test-order-123', message);
    }).not.toThrow();

    // Connection should be removed after error
    expect(wsService.getConnectionCount()).toBe(0);
  });

  test('should create status callback function', () => {
    const callback = wsService.createStatusCallback('test-order-456');
    
    expect(typeof callback).toBe('function');
    
    // Add connection for this order
    (wsService as any).connections.set('test-order-456', mockSocket);
    
    const message: WebSocketMessage = {
      orderId: 'test-order-456',
      status: OrderStatus.CONFIRMED,
      timestamp: new Date(),
      data: { txHash: '0xabc123' }
    };

    callback(message);
    
    expect(mockSocket.send).toHaveBeenCalledWith(JSON.stringify(message));
  });

  test('should broadcast to all connections', () => {
    // Add another connection
    const mockSocket2 = {
      send: jest.fn(),
      readyState: 1
    };
    (wsService as any).connections.set('test-order-456', mockSocket2);

    const broadcastMessage = {
      type: 'system',
      message: 'Server maintenance in 5 minutes'
    };

    wsService.broadcastToAll(broadcastMessage);

    expect(mockSocket.send).toHaveBeenCalledWith(JSON.stringify(broadcastMessage));
    expect(mockSocket2.send).toHaveBeenCalledWith(JSON.stringify(broadcastMessage));
  });

  test('should skip closed connections in broadcast', () => {
    mockSocket.readyState = 3; // WebSocket.CLOSED

    const message = { type: 'test', data: 'hello' };
    wsService.broadcastToAll(message);

    expect(mockSocket.send).not.toHaveBeenCalled();
  });

  test('should cleanup closed connections', () => {
    // Add connections with different states
    const closedSocket = { readyState: 3 }; // CLOSED
    const openSocket = { readyState: 1 };   // OPEN

    (wsService as any).connections.set('closed-order', closedSocket);
    (wsService as any).connections.set('open-order', openSocket);

    expect(wsService.getConnectionCount()).toBe(3); // original + 2 new

    wsService.cleanup();

    expect(wsService.getConnectionCount()).toBe(2); // closed connection removed
    expect(wsService.getActiveOrders()).not.toContain('closed-order');
    expect(wsService.getActiveOrders()).toContain('open-order');
  });
});