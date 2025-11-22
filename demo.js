#!/usr/bin/env node

/**
 * Demo script to test Order Execution Engine
 * This script demonstrates the complete order flow:
 * 1. Submit multiple orders
 * 2. Monitor WebSocket status updates
 * 3. Display results
 */

const WebSocket = require('ws');
const fetch = require('node-fetch');

const SERVER_URL = 'http://localhost:3000';
const WS_URL = 'ws://localhost:3000';

class OrderDemo {
  constructor() {
    this.orders = [];
    this.wsConnections = new Map();
  }

  // Submit a single order
  async submitOrder(tokenIn, tokenOut, amount) {
    try {
      const response = await fetch(`${SERVER_URL}/api/orders/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'market',
          tokenIn,
          tokenOut,
          amount
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log(`✅ Order submitted: ${result.orderId}`);
      
      // Connect to WebSocket for this order
      this.connectWebSocket(result.orderId);
      
      return result;
    } catch (error) {
      console.error(`❌ Failed to submit order:`, error.message);
      return null;
    }
  }

  // Connect to WebSocket for order status updates
  connectWebSocket(orderId) {
    const ws = new WebSocket(`${WS_URL}/ws/${orderId}`);
    this.wsConnections.set(orderId, ws);

    ws.on('open', () => {
      console.log(`🔌 WebSocket connected for order ${orderId}`);
    });

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log(`📡 ${orderId}: ${message.status}`, message.data || '');
        
        // Close connection when order is complete
        if (message.status === 'confirmed' || message.status === 'failed') {
          setTimeout(() => {
            ws.close();
            this.wsConnections.delete(orderId);
          }, 1000);
        }
      } catch (error) {
        console.error(`❌ WebSocket message error for ${orderId}:`, error.message);
      }
    });

    ws.on('close', () => {
      console.log(`🔌 WebSocket closed for order ${orderId}`);
    });

    ws.on('error', (error) => {
      console.error(`❌ WebSocket error for ${orderId}:`, error.message);
    });
  }

  // Submit multiple demo orders
  async runDemo() {
    console.log('🚀 Starting Order Execution Engine Demo\n');

    // Test server health first
    try {
      const healthResponse = await fetch(`${SERVER_URL}/health`);
      const health = await healthResponse.json();
      console.log('🏥 Server Health:', health.status);
      console.log('📊 Services:', health.services);
      console.log('');
    } catch (error) {
      console.error('❌ Server not available:', error.message);
      return;
    }

    // Submit demo orders
    const demoOrders = [
      { tokenIn: 'SOL', tokenOut: 'USDC', amount: 100 },
      { tokenIn: 'ETH', tokenOut: 'SOL', amount: 2 },
      { tokenIn: 'BTC', tokenOut: 'USDC', amount: 0.1 },
      { tokenIn: 'SOL', tokenOut: 'USDT', amount: 50 },
      { tokenIn: 'USDC', tokenOut: 'SOL', amount: 1000 }
    ];

    console.log(`📋 Submitting ${demoOrders.length} demo orders...\n`);

    for (const order of demoOrders) {
      await this.submitOrder(order.tokenIn, order.tokenOut, order.amount);
      // Small delay between orders
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Wait for orders to complete
    console.log('\n⏳ Waiting for orders to complete...\n');
    
    // Wait until all WebSocket connections are closed
    const waitForCompletion = () => {
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (this.wsConnections.size === 0) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 1000);
      });
    };

    await waitForCompletion();

    // Get final statistics
    try {
      const statsResponse = await fetch(`${SERVER_URL}/api/orders/stats`);
      const stats = await statsResponse.json();
      
      console.log('\n📊 Final Statistics:');
      console.log('Queue:', stats.queue);
      console.log('WebSockets:', stats.websockets);
      console.log('\n✅ Demo completed successfully!');
    } catch (error) {
      console.error('❌ Failed to get final stats:', error.message);
    }
  }
}

// Run demo if this file is executed directly
if (require.main === module) {
  const demo = new OrderDemo();
  demo.runDemo().catch(console.error);
}

module.exports = OrderDemo;