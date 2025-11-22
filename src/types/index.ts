export enum OrderStatus {
  PENDING = 'pending',
  ROUTING = 'routing', 
  BUILDING = 'building',
  SUBMITTED = 'submitted',
  CONFIRMED = 'confirmed',
  FAILED = 'failed'
}

export enum OrderType {
  MARKET = 'market',
  LIMIT = 'limit',
  SNIPER = 'sniper'
}

export enum DexType {
  RAYDIUM = 'raydium',
  METEORA = 'meteora'
}

export interface Order {
  id: string;
  type: OrderType;
  tokenIn: string;
  tokenOut: string;
  amount: number;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
  txHash?: string;
  executedPrice?: number;
  selectedDex?: DexType;
  error?: string;
}

export interface DexQuote {
  price: number;
  fee: number;
  liquidity: number;
  estimatedGas: number;
}

export interface SwapResult {
  txHash: string;
  executedPrice: number;
  actualAmount: number;
  gasUsed: number;
}

export interface OrderRequest {
  type: OrderType;
  tokenIn: string;
  tokenOut: string;
  amount: number;
  slippage?: number;
}

export interface WebSocketMessage {
  orderId: string;
  status: OrderStatus;
  timestamp: Date;
  data?: {
    txHash?: string;
    executedPrice?: number;
    selectedDex?: DexType;
    error?: string;
  };
}