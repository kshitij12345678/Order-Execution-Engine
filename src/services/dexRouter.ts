import { DexQuote, SwapResult, DexType } from '../types';

export class MockDexRouter {
  
  async getRaydiumQuote(tokenIn: string, tokenOut: string, amount: number): Promise<DexQuote> {
    await this.simulateNetworkDelay(150, 300);
    const basePrice = this.getBasePrice(tokenIn, tokenOut);
    const priceVariation = 0.98 + Math.random() * 0.04;
    
    return {
      price: basePrice * priceVariation,
      fee: 0.003,
      liquidity: 1000000 + Math.random() * 5000000,
      estimatedGas: 0.0001 + Math.random() * 0.0002
    };
  }
  
  async getMeteoraQuote(tokenIn: string, tokenOut: string, amount: number): Promise<DexQuote> {
    await this.simulateNetworkDelay(200, 400);
    const basePrice = this.getBasePrice(tokenIn, tokenOut);
    const priceVariation = 0.97 + Math.random() * 0.05;
    
    return {
      price: basePrice * priceVariation,
      fee: 0.002,
      liquidity: 800000 + Math.random() * 4000000,
      estimatedGas: 0.00015 + Math.random() * 0.00025
    };
  }
  
  async getBestQuote(tokenIn: string, tokenOut: string, amount: number): Promise<{ dex: DexType; quote: DexQuote }> {
    const [raydiumQuote, meteoraQuote] = await Promise.all([
      this.getRaydiumQuote(tokenIn, tokenOut, amount),
      this.getMeteoraQuote(tokenIn, tokenOut, amount)
    ]);
    
    const raydiumEffectivePrice = raydiumQuote.price * (1 - raydiumQuote.fee) - raydiumQuote.estimatedGas;
    const meteoraEffectivePrice = meteoraQuote.price * (1 - meteoraQuote.fee) - meteoraQuote.estimatedGas;
    
    if (raydiumEffectivePrice > meteoraEffectivePrice) {
      return { dex: DexType.RAYDIUM, quote: raydiumQuote };
    } else {
      return { dex: DexType.METEORA, quote: meteoraQuote };
    }
  }
  
  async executeSwap(dex: DexType, tokenIn: string, tokenOut: string, amount: number, expectedPrice: number): Promise<SwapResult> {
    await this.simulateNetworkDelay(2000, 4000);
    const slippage = Math.random() * 0.02;
    const executedPrice = expectedPrice * (1 - slippage);
    
    if (Math.random() < 0.05) {
      throw new Error(`${dex} swap failed: Network congestion`);
    }
    
    const actualAmount = amount * executedPrice;
    const txHash = this.generateMockTxHash();
    
    return {
      txHash,
      executedPrice,
      actualAmount,
      gasUsed: 0.0001 + Math.random() * 0.0003
    };
  }
  
  private getBasePrice(tokenIn: string, tokenOut: string): number {
    const mockPrices: Record<string, number> = {
      'SOL/USDC': 100,
      'SOL/USDT': 99.8,
      'ETH/USDC': 2000,
      'ETH/SOL': 20,
      'BTC/USDC': 45000,
      'USDC/SOL': 0.01,
      'USDT/SOL': 0.01002
    };
    
    const pair = `${tokenIn}/${tokenOut}`;
    const reversePair = `${tokenOut}/${tokenIn}`;
    
    if (mockPrices[pair]) {
      return mockPrices[pair];
    } else if (mockPrices[reversePair]) {
      return 1 / mockPrices[reversePair];
    } else {
      return 100;
    }
  }
  
  private async simulateNetworkDelay(minMs: number, maxMs: number): Promise<void> {
    const delay = minMs + Math.random() * (maxMs - minMs);
    return new Promise(resolve => setTimeout(resolve, delay));
  }
  
  private generateMockTxHash(): string {
    const chars = '0123456789abcdef';
    let result = '0x';
    for (let i = 0; i < 64; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}
