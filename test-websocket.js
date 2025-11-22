const WebSocket = require('ws');

// Test WebSocket connection
function testWebSocket() {
  console.log('🔌 Testing WebSocket connection...');
  
  // Submit an order first to get an order ID
  const orderData = {
    type: 'market',
    tokenIn: 'ETH',
    tokenOut: 'USDC',
    amount: 2.5
  };

  // Submit order via HTTP
  const http = require('http');
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
        console.log('📦 Order submitted:', response);
        
        if (response.orderId) {
          // Connect to WebSocket for this order
          const wsUrl = `ws://localhost:3000/ws/${response.orderId}`;
          console.log('🔗 Connecting to:', wsUrl);
          
          const ws = new WebSocket(wsUrl);
          
          ws.on('open', () => {
            console.log('✅ WebSocket connected successfully!');
          });
          
          ws.on('message', (data) => {
            const message = JSON.parse(data.toString());
            console.log('📨 WebSocket message received:', message);
          });
          
          ws.on('close', () => {
            console.log('🔌 WebSocket connection closed');
          });
          
          ws.on('error', (error) => {
            console.error('❌ WebSocket error:', error.message);
          });
          
          // Close connection after 10 seconds
          setTimeout(() => {
            ws.close();
            process.exit(0);
          }, 10000);
        }
      } catch (error) {
        console.error('❌ Error parsing response:', error.message);
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ HTTP request error:', error.message);
  });

  req.write(data);
  req.end();
}

testWebSocket();