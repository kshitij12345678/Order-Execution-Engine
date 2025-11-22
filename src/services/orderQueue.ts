import { Queue, Worker, Job } from 'bullmq';
import { config } from '../config/database';
import { MockDexRouter } from './dexRouter';
import { OrderModel } from '../models/Order';
import { Order, OrderStatus, WebSocketMessage } from '../types';

interface OrderJobData {
  orderId: string;
  orderData: Order;
}

export class OrderProcessor {
  private queue: Queue;
  private worker: Worker | null = null;
  private dexRouter: MockDexRouter;
  private statusCallbacks: Map<string, Function> = new Map();
  private redisConnection: any;

  constructor() {
    this.dexRouter = new MockDexRouter();
    
    // Initialize BullMQ queue with Redis connection options
    this.redisConnection = process.env.REDIS_URL 
      ? { url: process.env.REDIS_URL }
      : { host: process.env.REDIS_HOST || 'localhost', port: parseInt(process.env.REDIS_PORT || '6379') };
    
    this.queue = new Queue('order-execution', {
      connection: this.redisConnection,
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        }
      }
    });

    this.initializeWorker();
  }

  // Add order to processing queue
  async addOrder(order: Order, statusCallback: Function): Promise<void> {
    this.statusCallbacks.set(order.id, statusCallback);
    
    await this.queue.add('execute-order', {
      orderId: order.id,
      orderData: order
    } as OrderJobData, {
      priority: 1,
      delay: 0
    });

    // Store order in Redis for quick access
    await OrderModel.setActiveOrder(order);
    
    // Initial status update
    this.emitStatus(order.id, OrderStatus.PENDING);
  }

  // Initialize queue worker
  private initializeWorker(): void {
    this.worker = new Worker('order-execution', async (job: Job<OrderJobData>) => {
      const { orderId, orderData } = job.data;
      
      try {
        await this.processOrderExecution(orderId, orderData, job);
      } catch (error) {
        console.error(`Order ${orderId} processing failed:`, error);
        await this.handleOrderFailure(orderId, error as Error);
        throw error; // Re-throw for BullMQ retry mechanism
      }
    }, {
      connection: this.redisConnection,
      concurrency: 5, // Process up to 5 orders concurrently
      maxStalledCount: 3,
      stalledInterval: 30000
    });

    // Worker event handlers
    this.worker.on('completed', (job) => {
      console.log(`Order ${job.data.orderId} completed successfully`);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`Order ${job?.data.orderId} failed:`, err.message);
    });

    this.worker.on('stalled', (jobId) => {
      console.warn(`Order job ${jobId} stalled`);
    });
  }

  // Process individual order through the execution pipeline
  private async processOrderExecution(orderId: string, orderData: Order, job: Job): Promise<void> {
    // Update progress for job tracking
    await job.updateProgress(10);
    
    // Step 1: Route and find best DEX
    this.emitStatus(orderId, OrderStatus.ROUTING);
    await job.updateProgress(30);
    
    const bestRoute = await this.dexRouter.getBestQuote(
      orderData.tokenIn, 
      orderData.tokenOut, 
      orderData.amount
    );
    
    console.log(`Order ${orderId}: Best route found on ${bestRoute.dex} at price ${bestRoute.quote.price}`);
    
    // Step 2: Build transaction
    this.emitStatus(orderId, OrderStatus.BUILDING);
    await job.updateProgress(50);
    
    // Simulate transaction building time
    await this.simulateDelay(500, 1000);
    
    // Step 3: Submit transaction
    this.emitStatus(orderId, OrderStatus.SUBMITTED);
    await job.updateProgress(70);
    
    // Execute the swap
    const swapResult = await this.dexRouter.executeSwap(
      bestRoute.dex,
      orderData.tokenIn,
      orderData.tokenOut,
      orderData.amount,
      bestRoute.quote.price
    );
    
    await job.updateProgress(90);
    
    // Step 4: Confirm completion
    await this.handleOrderSuccess(orderId, bestRoute.dex, swapResult);
    await job.updateProgress(100);
  }

  // Handle successful order completion
  private async handleOrderSuccess(orderId: string, selectedDex: any, swapResult: any): Promise<void> {
    // Update order in database
    await OrderModel.update(orderId, {
      status: OrderStatus.CONFIRMED,
      txHash: swapResult.txHash,
      executedPrice: swapResult.executedPrice,
      selectedDex: selectedDex
    });

    // Remove from active orders cache
    await OrderModel.removeActiveOrder(orderId);

    // Emit final status
    this.emitStatus(orderId, OrderStatus.CONFIRMED, {
      txHash: swapResult.txHash,
      executedPrice: swapResult.executedPrice,
      selectedDex: selectedDex
    });

    console.log(`Order ${orderId} completed: TX ${swapResult.txHash}`);
  }

  // Handle order failure
  private async handleOrderFailure(orderId: string, error: Error): Promise<void> {
    // Update order in database
    await OrderModel.update(orderId, {
      status: OrderStatus.FAILED,
      error: error.message
    });

    // Remove from active orders cache
    await OrderModel.removeActiveOrder(orderId);

    // Emit failure status
    this.emitStatus(orderId, OrderStatus.FAILED, {
      error: error.message
    });

    console.error(`Order ${orderId} failed: ${error.message}`);
  }

  // Emit status update via callback
  private emitStatus(orderId: string, status: OrderStatus, data?: any): void {
    const callback = this.statusCallbacks.get(orderId);
    if (callback) {
      const message: WebSocketMessage = {
        orderId,
        status,
        timestamp: new Date(),
        data
      };
      callback(message);
    }

    // Clean up callback for final statuses
    if (status === OrderStatus.CONFIRMED || status === OrderStatus.FAILED) {
      this.statusCallbacks.delete(orderId);
    }
  }

  // Get queue statistics
  async getQueueStats() {
    const waiting = await this.queue.getWaiting();
    const active = await this.queue.getActive();
    const completed = await this.queue.getCompleted();
    const failed = await this.queue.getFailed();

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length
    };
  }

  // Graceful shutdown
  async shutdown(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
    }
    await this.queue.close();
    console.log('Order processor shutdown complete');
  }

  private async simulateDelay(minMs: number, maxMs: number): Promise<void> {
    const delay = minMs + Math.random() * (maxMs - minMs);
    return new Promise(resolve => setTimeout(resolve, delay));
  }
}