import { pool, redisClient } from '../config/database';
import { Order, OrderStatus, OrderType, DexType } from '../types';

export class OrderModel {
  
  // Create new order in database
  static async create(orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Promise<Order> {
    const id = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();
    
    const query = `
      INSERT INTO orders (id, type, token_in, token_out, amount, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    const values = [
      id,
      orderData.type,
      orderData.tokenIn,
      orderData.tokenOut,
      orderData.amount,
      orderData.status,
      now,
      now
    ];
    
    const result = await pool.query(query, values);
    return this.mapRowToOrder(result.rows[0]);
  }
  
  // Update order status and details
  static async update(id: string, updates: Partial<Order>): Promise<Order | null> {
    const updateFields = [];
    const values = [];
    let paramCount = 1;
    
    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'createdAt') {
        const dbKey = this.camelToSnake(key);
        updateFields.push(`${dbKey} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });
    
    updateFields.push(`updated_at = $${paramCount}`);
    values.push(new Date());
    values.push(id);
    
    const query = `
      UPDATE orders 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount + 1}
      RETURNING *
    `;
    
    const result = await pool.query(query, values);
    return result.rows.length > 0 ? this.mapRowToOrder(result.rows[0]) : null;
  }
  
  // Get order by ID
  static async findById(id: string): Promise<Order | null> {
    const query = 'SELECT * FROM orders WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows.length > 0 ? this.mapRowToOrder(result.rows[0]) : null;
  }
  
  // Get orders by status
  static async findByStatus(status: OrderStatus): Promise<Order[]> {
    const query = 'SELECT * FROM orders WHERE status = $1 ORDER BY created_at DESC';
    const result = await pool.query(query, [status]);
    return result.rows.map(row => this.mapRowToOrder(row));
  }
  
  // Store active order in Redis for quick access
  static async setActiveOrder(order: Order): Promise<void> {
    await redisClient.setEx(`active_order:${order.id}`, 3600, JSON.stringify(order));
  }
  
  // Get active order from Redis
  static async getActiveOrder(id: string): Promise<Order | null> {
    const orderData = await redisClient.get(`active_order:${id}`);
    return orderData ? JSON.parse(orderData) : null;
  }
  
  // Remove active order from Redis
  static async removeActiveOrder(id: string): Promise<void> {
    await redisClient.del(`active_order:${id}`);
  }
  
  // Convert database row to Order object
  private static mapRowToOrder(row: any): Order {
    return {
      id: row.id,
      type: row.type as OrderType,
      tokenIn: row.token_in,
      tokenOut: row.token_out,
      amount: parseFloat(row.amount),
      status: row.status as OrderStatus,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      txHash: row.tx_hash,
      executedPrice: row.executed_price ? parseFloat(row.executed_price) : undefined,
      selectedDex: row.selected_dex as DexType,
      error: row.error
    };
  }
  
  // Convert camelCase to snake_case for database columns
  private static camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}