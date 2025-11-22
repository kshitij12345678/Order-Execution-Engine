import { OrderModel } from '../models/Order';
import { OrderType, OrderStatus, DexType } from '../types';
import { pool } from '../config/database';

// Mock database
jest.mock('../config/database', () => ({
  pool: {
    query: jest.fn()
  },
  redisClient: {
    setEx: jest.fn(),
    get: jest.fn(),
    del: jest.fn()
  }
}));

describe('OrderModel Database Operations', () => {
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should create new order in database', async () => {
    const mockResult = {
      rows: [{
        id: 'order_123',
        type: 'market',
        token_in: 'SOL',
        token_out: 'USDC',
        amount: '100',
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date()
      }]
    };

    (pool.query as jest.Mock).mockResolvedValue(mockResult);

    const result = await OrderModel.create(mockOrder);

    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO orders'),
      expect.arrayContaining(['SOL', 'USDC', 100])
    );
    expect(result).toHaveProperty('id');
    expect(result.tokenIn).toBe('SOL');
    expect(result.tokenOut).toBe('USDC');
  });

  test('should update order status and details', async () => {
    const mockResult = {
      rows: [{
        id: 'test-order-123',
        type: 'market',
        token_in: 'SOL',
        token_out: 'USDC',
        amount: '100',
        status: 'confirmed',
        tx_hash: '0xabc123',
        executed_price: '99.5',
        selected_dex: 'raydium',
        created_at: new Date(),
        updated_at: new Date()
      }]
    };

    (pool.query as jest.Mock).mockResolvedValue(mockResult);

    const result = await OrderModel.update('test-order-123', {
      status: OrderStatus.CONFIRMED,
      txHash: '0xabc123',
      executedPrice: 99.5,
      selectedDex: DexType.RAYDIUM
    });

    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE orders'),
      expect.arrayContaining([OrderStatus.CONFIRMED, '0xabc123', 99.5, DexType.RAYDIUM])
    );
    expect(result?.status).toBe(OrderStatus.CONFIRMED);
    expect(result?.txHash).toBe('0xabc123');
  });

  test('should find order by ID', async () => {
    const mockResult = {
      rows: [{
        id: 'test-order-123',
        type: 'market',
        token_in: 'SOL',
        token_out: 'USDC',
        amount: '100',
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date()
      }]
    };

    (pool.query as jest.Mock).mockResolvedValue(mockResult);

    const result = await OrderModel.findById('test-order-123');

    expect(pool.query).toHaveBeenCalledWith(
      'SELECT * FROM orders WHERE id = $1',
      ['test-order-123']
    );
    expect(result?.id).toBe('test-order-123');
    expect(result?.tokenIn).toBe('SOL');
  });

  test('should return null for non-existent order', async () => {
    (pool.query as jest.Mock).mockResolvedValue({ rows: [] });

    const result = await OrderModel.findById('non-existent');

    expect(result).toBeNull();
  });

  test('should find orders by status', async () => {
    const mockResult = {
      rows: [
        {
          id: 'order-1',
          type: 'market',
          token_in: 'SOL',
          token_out: 'USDC',
          amount: '100',
          status: 'confirmed',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 'order-2',
          type: 'market',
          token_in: 'ETH',
          token_out: 'SOL',
          amount: '2',
          status: 'confirmed',
          created_at: new Date(),
          updated_at: new Date()
        }
      ]
    };

    (pool.query as jest.Mock).mockResolvedValue(mockResult);

    const result = await OrderModel.findByStatus(OrderStatus.CONFIRMED);

    expect(pool.query).toHaveBeenCalledWith(
      'SELECT * FROM orders WHERE status = $1 ORDER BY created_at DESC',
      [OrderStatus.CONFIRMED]
    );
    expect(result).toHaveLength(2);
    expect(result[0].status).toBe(OrderStatus.CONFIRMED);
    expect(result[1].status).toBe(OrderStatus.CONFIRMED);
  });

  test('should handle database errors gracefully', async () => {
    (pool.query as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

    await expect(OrderModel.findById('test-order')).rejects.toThrow('Database connection failed');
  });

  test('should convert camelCase to snake_case correctly', () => {
    // Test the private method indirectly through update
    const mockResult = { rows: [] };
    (pool.query as jest.Mock).mockResolvedValue(mockResult);

    OrderModel.update('test-id', {
      executedPrice: 99.5,
      selectedDex: DexType.RAYDIUM,
      txHash: '0xabc'
    });

    const queryCall = (pool.query as jest.Mock).mock.calls[0][0];
    expect(queryCall).toContain('executed_price');
    expect(queryCall).toContain('selected_dex');
    expect(queryCall).toContain('tx_hash');
  });
});