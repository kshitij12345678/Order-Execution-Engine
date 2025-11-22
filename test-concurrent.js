const http = require('http');

// Test concurrent order processing
async function testConcurrentOrders() {
  console.log('🚀 Testing concurrent order processing...\n');
  
  const orders = [
    { type: 'market', tokenIn: 'SOL', tokenOut: 'USDC', amount: 1.0 },
    { type: 'market', tokenIn: 'BTC', tokenOut: 'USDT', amount: 0.05 },
    { type: 'market', tokenIn: 'ETH', tokenOut: 'DAI', amount: 1.5 },
    { type: 'market', tokenIn: 'AVAX', tokenOut: 'USDC', amount: 10.0 },
    { type: 'market', tokenIn: 'MATIC', tokenOut: 'USDT', amount: 100.0 }
  ];
  
  const startTime = Date.now();
  
  // Submit all orders simultaneously
  const promises = orders.map((orderData, index) => {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify(orderData);
      
      const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/orders/execute',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': data.length
        }
      };
      
      const req = http.request(options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          try {
            const response = JSON.parse(responseData);
            console.log(`📦 Order ${index + 1} submitted:`, {
              orderId: response.orderId,
              pair: `${orderData.tokenIn}/${orderData.tokenOut}`,
              amount: orderData.amount,
              status: response.status
            });
            resolve(response);
          } catch (error) {
            reject(error);
          }
        });
      });
      
      req.on('error', reject);
      req.write(data);
      req.end();
    });
  });
  
  try {
    // Wait for all orders to be submitted
    const responses = await Promise.all(promises);
    const submitTime = Date.now() - startTime;
    
    console.log(`\n✅ All ${responses.length} orders submitted in ${submitTime}ms`);
    
    // Wait a bit and check queue statistics
    setTimeout(async () => {
      const stats = await getQueueStats();
      console.log('\n📊 Final Queue Statistics:', stats);
      
      console.log('\n🎯 Concurrent Processing Test Results:');
      console.log(`   • Orders submitted: ${responses.length}`);
      console.log(`   • Submission time: ${submitTime}ms`);
      console.log(`   • Completed orders: ${stats.queue.completed}`);
      console.log(`   • Failed orders: ${stats.queue.failed}`);
      console.log(`   • Success rate: ${(stats.queue.completed / (stats.queue.completed + stats.queue.failed) * 100).toFixed(1)}%`);
    }, 8000);
    
  } catch (error) {
    console.error('❌ Error in concurrent testing:', error.message);
  }
}

function getQueueStats() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/orders/stats',
      method: 'GET'
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (error) {
          reject(error);
        }
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

testConcurrentOrders();