import { OrderProcessor } from '../services/orderQueue';
import { WebSocketService } from '../services/websocket';
import { OrderType, OrderStatus } from '../types';

// Mock Redis and Database
jest.mock('../config/database', () => ({
  config: {
    redis: { host: 'localhost', port: 6379 },
    database: { host: 'localhost', port: 5432, database: 'test', user: 'test', password: 'test' }
  },
  initializeDatabase: jest.fn(),
}));

jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: jest.fn(),
    close: jest.fn(),
    getWaiting: jest.fn().mockResolvedValue([]),
    getActive: jest.fn().mockResolvedValue([]),
    getCompleted: jest.fn().mockResolvedValue([]),
    getFailed: jest.fn().mockResolvedValue([])
  })),
  Worker: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    close: jest.fn()
  }))
}));

jest.mock('../models/Order', () => ({
  OrderModel: {
    create: jest.fn().mockResolvedValue({}),
    setActiveOrder: jest.fn(),
    removeActiveOrder: jest.fn(),
    update: jest.fn(),
    findById: jest.fn(),
    getActiveOrder: jest.fn()
  }
}));

describe('Order Processing Integration', () => {
  let orderProcessor: OrderProcessor;
  let webSocketService: WebSocketService;

  beforeEach(() => {
    orderProcessor = new OrderProcessor();
    webSocketService = new WebSocketService();
  });

  test('should create order processor instance', () => {
    expect(orderProcessor).toBeDefined();
    expect(typeof orderProcessor.addOrder).toBe('function');
    expect(typeof orderProcessor.getQueueStats).toBe('function');
  });

  test('should create websocket service instance', () => {
    expect(webSocketService).toBeDefined();
    expect(typeof webSocketService.createStatusCallback).toBe('function');
    expect(typeof webSocketService.getConnectionCount).toBe('function');
  });

  test('should get queue statistics', async () => {
    const stats = await orderProcessor.getQueueStats();
    
    expect(stats).toHaveProperty('waiting');
    expect(stats).toHaveProperty('active');
    expect(stats).toHaveProperty('completed');
    expect(stats).toHaveProperty('failed');
    expect(typeof stats.waiting).toBe('number');
    expect(typeof stats.active).toBe('number');
    expect(typeof stats.completed).toBe('number');
    expect(typeof stats.failed).toBe('number');
  });

  test('should create status callback', () => {
    const callback = webSocketService.createStatusCallback('test-order-123');
    expect(typeof callback).toBe('function');
  });

  test('should track connection count', () => {
    const count = webSocketService.getConnectionCount();
    expect(typeof count).toBe('number');
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should get active orders list', () => {
    const orders = webSocketService.getActiveOrders();
    expect(Array.isArray(orders)).toBe(true);
  });

  test('should add order to processing queue', async () => {
    const mockOrder = {
      id: 'test-order-123',
      type: OrderType.MARKET,
      tokenIn: 'SOL',
      tokenOut: 'USDC',
      amount: 100,
      status: OrderStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const mockCallback = jest.fn();
    
    await expect(
      orderProcessor.addOrder(mockOrder, mockCallback)
    ).resolves.toBeUndefined();
  });
});