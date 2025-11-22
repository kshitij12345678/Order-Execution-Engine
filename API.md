# Order Execution Engine API Documentation

## Overview
High-performance DEX order execution engine with real-time WebSocket updates.

## Base URL
```
http://localhost:3000
```

## Endpoints

### Health Check
```http
GET /health
```
**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-22T10:30:00.000Z",
  "services": {
    "database": "connected",
    "queue": { "waiting": 0, "active": 2, "completed": 15, "failed": 0 },
    "websockets": 3
  }
}
```

### Submit Order
```http
POST /api/orders/execute
Content-Type: application/json
```

**Request Body:**
```json
{
  "type": "market",
  "tokenIn": "SOL",
  "tokenOut": "USDC", 
  "amount": 100,
  "slippage": 0.02
}
```

**Response (201):**
```json
{
  "orderId": "order_1732272600000_abc12345",
  "status": "accepted",
  "message": "Order submitted for execution",
  "websocketUrl": "/ws/order_1732272600000_abc12345"
}
```

**Error Response (400):**
```json
{
  "error": "Missing required fields: tokenIn, tokenOut, amount"
}
```

### Get Order Status
```http
GET /api/orders/{orderId}
```

**Response:**
```json
{
  "id": "order_1732272600000_abc12345",
  "type": "market",
  "tokenIn": "SOL",
  "tokenOut": "USDC",
  "amount": 100,
  "status": "confirmed",
  "createdAt": "2025-11-22T10:30:00.000Z",
  "updatedAt": "2025-11-22T10:30:05.000Z",
  "txHash": "0x1234567890abcdef...",
  "executedPrice": 99.25,
  "selectedDex": "raydium"
}
```

### Queue Statistics
```http
GET /api/orders/stats
```

**Response:**
```json
{
  "queue": {
    "waiting": 0,
    "active": 2, 
    "completed": 15,
    "failed": 0
  },
  "websockets": {
    "connections": 3,
    "activeOrders": ["order_123", "order_456"]
  },
  "timestamp": "2025-11-22T10:30:00.000Z"
}
```

### Recent Orders
```http
GET /api/orders?limit=10&status=confirmed
```

**Response:**
```json
{
  "orders": [
    {
      "id": "order_1732272600000_abc12345",
      "type": "market",
      "tokenIn": "SOL",
      "tokenOut": "USDC",
      "amount": 100,
      "status": "confirmed",
      "executedPrice": 99.25,
      "selectedDex": "raydium",
      "createdAt": "2025-11-22T10:30:00.000Z"
    }
  ],
  "count": 1,
  "timestamp": "2025-11-22T10:30:00.000Z"
}
```

## WebSocket Connection

### Connect
```javascript
const ws = new WebSocket('ws://localhost:3000/ws/ORDER_ID');
```

### Message Format
```json
{
  "orderId": "order_1732272600000_abc12345",
  "status": "routing",
  "timestamp": "2025-11-22T10:30:02.000Z",
  "data": {
    "selectedDex": "raydium",
    "executedPrice": 99.25,
    "txHash": "0x1234567890abcdef..."
  }
}
```

### Order Status Flow
1. **pending** → Order received and queued
2. **routing** → Comparing DEX prices (Raydium vs Meteora)
3. **building** → Creating transaction
4. **submitted** → Transaction sent to network  
5. **confirmed** → Transaction successful ✅
6. **failed** → Error occurred ❌

## Error Codes

| Code | Description |
|------|-------------|
| 400  | Bad Request - Invalid input |
| 404  | Order not found |
| 500  | Internal server error |

## Rate Limits
- **Order submission**: 100 requests/minute
- **WebSocket connections**: 50 concurrent connections
- **Queue capacity**: 1000 pending orders

## Design Decisions

### Why Market Orders?
- **Immediate execution**: No waiting for price conditions
- **Simpler implementation**: Focus on architecture over complex order logic  
- **Real-world relevance**: Most common order type in DEX trading

### Extension for Other Order Types
- **Limit Orders**: Add price monitoring service with scheduled checks
- **Sniper Orders**: Implement token launch detection with event listeners

## Testing
Use the provided Postman collection (`postman-collection.json`) for comprehensive API testing.