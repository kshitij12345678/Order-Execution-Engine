import { OrderProcessor } from '../services/orderQueue';
import { OrderType, OrderStatus } from '../types';

// Mock dependencies
jest.mock('../config/database', () => ({
  config: {
    redis: { host: 'localhost', port: 6379 }
  }
}));

jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: jest.fn().mockResolvedValue({ id: 'job-123' }),
    close: jest.fn(),
    getWaiting: jest.fn().mockResolvedValue([]),
    getActive: jest.fn().mockResolvedValue([{ id: 'active-job-1' }, { id: 'active-job-2' }]),
    getCompleted: jest.fn().mockResolvedValue([{ id: 'completed-job-1' }]),
    getFailed: jest.fn().mockResolvedValue([])
  })),
  Worker: jest.fn().mockImplementation((queueName, processor, options) => {
    // Store the processor function to test it
    setImmediate(() => processor); // Simulate async processor setup
    return {
      on: jest.fn(),
      close: jest.fn()
    };
  })
}));

jest.mock('../models/Order', () => ({
  OrderModel: {
    setActiveOrder: jest.fn(),
    removeActiveOrder: jest.fn(),
    update: jest.fn()
  }
}));

jest.mock('../services/dexRouter', () => ({
  MockDexRouter: jest.fn().mockImplementation(() => ({
    getBestQuote: jest.fn().mockResolvedValue({
      dex: 'raydium',
      quote: { price: 99.5, fee: 0.003, liquidity: 1000000, estimatedGas: 0.0001 }
    }),
    executeSwap: jest.fn().mockResolvedValue({
      txHash: '0xabc123def456',
      executedPrice: 99.2,
      actualAmount: 9920,
      gasUsed: 0.00012
    })
  }))
}));

describe('OrderProcessor Queue System', () => {
  let orderProcessor: OrderProcessor;

  beforeEach(() => {
    orderProcessor = new OrderProcessor();
  });

  test('should create order processor instance', () => {
    expect(orderProcessor).toBeDefined();
    expect(typeof orderProcessor.addOrder).toBe('function');
    expect(typeof orderProcessor.getQueueStats).toBe('function');
    expect(typeof orderProcessor.shutdown).toBe('function');
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

    await orderProcessor.addOrder(mockOrder, mockCallback);

    // Verify queue.add was called
    const mockQueue = (orderProcessor as any).queue;
    expect(mockQueue.add).toHaveBeenCalledWith(
      'execute-order',
      {
        orderId: 'test-order-123',
        orderData: mockOrder
      },
      {
        priority: 1,
        delay: 0
      }
    );
  });

  test('should get queue statistics', async () => {
    const stats = await orderProcessor.getQueueStats();

    expect(stats).toEqual({
      waiting: 0,
      active: 2,
      completed: 1,
      failed: 0
    });
  });

  test('should handle shutdown gracefully', async () => {
    const mockWorker = (orderProcessor as any).worker;
    const mockQueue = (orderProcessor as any).queue;

    await orderProcessor.shutdown();

    if (mockWorker) {
      expect(mockWorker.close).toHaveBeenCalled();
    }
    expect(mockQueue.close).toHaveBeenCalled();
  });

  test('should emit status updates during order processing', async () => {
    const mockOrder = {
      id: 'test-order-456',
      type: OrderType.MARKET,
      tokenIn: 'ETH',
      tokenOut: 'SOL',
      amount: 2,
      status: OrderStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const mockCallback = jest.fn();

    // Add order and capture callback
    await orderProcessor.addOrder(mockOrder, mockCallback);

    // Verify initial status was emitted
    expect(mockCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: 'test-order-456',
        status: OrderStatus.PENDING
      })
    );
  });

  test('should handle queue errors', async () => {
    const mockQueue = (orderProcessor as any).queue;
    mockQueue.add.mockRejectedValueOnce(new Error('Redis connection failed'));

    const mockOrder = {
      id: 'failing-order',
      type: OrderType.MARKET,
      tokenIn: 'BTC',
      tokenOut: 'USDC',
      amount: 0.1,
      status: OrderStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const mockCallback = jest.fn();

    await expect(
      orderProcessor.addOrder(mockOrder, mockCallback)
    ).rejects.toThrow('Redis connection failed');
  });

  test('should maintain status callback registry', async () => {
    const mockOrder1 = {
      id: 'order-1',
      type: OrderType.MARKET,
      tokenIn: 'SOL',
      tokenOut: 'USDC',
      amount: 100,
      status: OrderStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const mockOrder2 = {
      id: 'order-2',
      type: OrderType.MARKET,
      tokenIn: 'ETH',
      tokenOut: 'SOL',
      amount: 2,
      status: OrderStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const callback1 = jest.fn();
    const callback2 = jest.fn();

    await orderProcessor.addOrder(mockOrder1, callback1);
    await orderProcessor.addOrder(mockOrder2, callback2);

    // Check that callbacks are stored separately
    const callbacks = (orderProcessor as any).statusCallbacks;
    expect(callbacks.size).toBe(2);
    expect(callbacks.has('order-1')).toBe(true);
    expect(callbacks.has('order-2')).toBe(true);
  });

  test('should clean up callbacks after order completion', () => {
    const orderProcessor = new OrderProcessor();
    const callbacks = (orderProcessor as any).statusCallbacks;
    
    // Manually add a callback
    callbacks.set('test-order', jest.fn());
    expect(callbacks.size).toBe(1);

    // Simulate status emission for completed order
    const emitStatus = (orderProcessor as any).emitStatus.bind(orderProcessor);
    emitStatus('test-order', OrderStatus.CONFIRMED);

    // Callback should be cleaned up
    expect(callbacks.size).toBe(0);
  });
});