const WebSocket = require('ws');
const http = require('http');

async function testOrderProgressWebSocket() {
  console.log('🚀 Testing Order Execution Progress via WebSocket');
  console.log('=================================================\n');

  // Step 1: Submit an order
  const orderData = {
    type: 'market',
    tokenIn: 'SOL',
    tokenOut: 'USDC',
    amount: 2.5
  };

  console.log('📦 Submitting order:', orderData);

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

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(responseData);
          console.log('✅ Order submitted successfully!');
          console.log('   Order ID:', response.orderId);
          console.log('   Status:', response.status);
          console.log('   WebSocket URL:', response.websocketUrl);
          console.log('\n📡 Connecting to WebSocket for real-time updates...\n');
          
          if (response.orderId) {
            // Step 2: Connect to WebSocket
            const wsUrl = `ws://localhost:3000/ws/${response.orderId}`;
            const ws = new WebSocket(wsUrl);
            
            const statusUpdates = [];
            const startTime = Date.now();
            
            ws.on('open', () => {
              console.log('🔌 WebSocket connected!');
            });
            
            ws.on('message', (data) => {
              const message = JSON.parse(data.toString());
              const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
              const elapsed = Date.now() - startTime;
              
              console.log(`[${timestamp}] +${elapsed}ms - ${getStatusEmoji(message.type || message.status)} Status: ${message.type || message.status}`);
              
              if (message.data) {
                console.log(`                           📊 Data:`, message.data);
              }
              
              statusUpdates.push({
                status: message.type || message.status,
                timestamp: message.timestamp,
                elapsed,
                data: message.data
              });
              
              // Close connection when order is complete
              if (message.status === 'confirmed' || message.status === 'failed') {
                console.log('\n🎯 Order Execution Complete!');
                console.log('📈 Status Progression:');
                statusUpdates.forEach((update, index) => {
                  console.log(`   ${index + 1}. ${update.status.toUpperCase()} (+${update.elapsed}ms)`);
                });
                
                ws.close();
                resolve(statusUpdates);
              }
            });
            
            ws.on('close', () => {
              console.log('\n🔌 WebSocket connection closed');
            });
            
            ws.on('error', (error) => {
              console.error('❌ WebSocket error:', error.message);
              reject(error);
            });
            
          }
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function getStatusEmoji(status) {
  const emojis = {
    'connected': '🔗',
    'pending': '⏳',
    'routing': '🔍',
    'building': '🏗️',
    'submitted': '📤',
    'confirmed': '✅',
    'failed': '❌'
  };
  return emojis[status] || '📋';
}

// Run the test
testOrderProgressWebSocket()
  .then(() => {
    console.log('\n✅ WebSocket test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  });