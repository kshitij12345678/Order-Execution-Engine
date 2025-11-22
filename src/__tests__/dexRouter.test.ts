import { MockDexRouter } from '../services/dexRouter';
import { DexType } from '../types';

describe('MockDexRouter', () => {
  let router: MockDexRouter;

  beforeEach(() => {
    router = new MockDexRouter();
  });

  test('should return valid Raydium quote', async () => {
    const quote = await router.getRaydiumQuote('SOL', 'USDC', 100);
    
    expect(quote).toHaveProperty('price');
    expect(quote).toHaveProperty('fee');
    expect(quote).toHaveProperty('liquidity');
    expect(quote).toHaveProperty('estimatedGas');
    
    expect(quote.fee).toBe(0.003);
    expect(quote.price).toBeGreaterThan(0);
    expect(quote.liquidity).toBeGreaterThan(0);
    expect(quote.estimatedGas).toBeGreaterThan(0);
  });

  test('should return valid MeteoraQuote', async () => {
    const quote = await router.getMeteoraQuote('SOL', 'USDC', 100);
    
    expect(quote).toHaveProperty('price');
    expect(quote).toHaveProperty('fee');
    expect(quote).toHaveProperty('liquidity');
    expect(quote).toHaveProperty('estimatedGas');
    
    expect(quote.fee).toBe(0.002);
    expect(quote.price).toBeGreaterThan(0);
    expect(quote.liquidity).toBeGreaterThan(0);
    expect(quote.estimatedGas).toBeGreaterThan(0);
  });

  test('should select best DEX based on effective price', async () => {
    const bestRoute = await router.getBestQuote('SOL', 'USDC', 100);
    
    expect(bestRoute).toHaveProperty('dex');
    expect(bestRoute).toHaveProperty('quote');
    expect([DexType.RAYDIUM, DexType.METEORA]).toContain(bestRoute.dex);
  });

  test('should execute swap successfully', async () => {
    const result = await router.executeSwap(DexType.RAYDIUM, 'SOL', 'USDC', 100, 99.5);
    
    expect(result).toHaveProperty('txHash');
    expect(result).toHaveProperty('executedPrice');
    expect(result).toHaveProperty('actualAmount');
    expect(result).toHaveProperty('gasUsed');
    
    expect(result.txHash).toMatch(/^0x[a-f0-9]{64}$/);
    expect(result.executedPrice).toBeGreaterThan(0);
    expect(result.actualAmount).toBeGreaterThan(0);
    expect(result.gasUsed).toBeGreaterThan(0);
  });

  test('should handle swap failures', async () => {
    // Mock Math.random to always return 0.01 (which is < 0.05, triggering failure)
    const originalRandom = Math.random;
    Math.random = jest.fn(() => 0.01);

    await expect(
      router.executeSwap(DexType.RAYDIUM, 'SOL', 'USDC', 100, 99.5)
    ).rejects.toThrow('raydium swap failed: Network congestion');

    // Restore original Math.random
    Math.random = originalRandom;
  });

  test('should have different prices between DEXs', async () => {
    const [raydiumQuote, meteoraQuote] = await Promise.all([
      router.getRaydiumQuote('SOL', 'USDC', 100),
      router.getMeteoraQuote('SOL', 'USDC', 100)
    ]);

    // Prices should be different due to different variation ranges
    expect(raydiumQuote.price).not.toBe(meteoraQuote.price);
    expect(raydiumQuote.fee).not.toBe(meteoraQuote.fee);
  });

  test('should handle reverse pair pricing', async () => {
    const solToUsdc = await router.getRaydiumQuote('SOL', 'USDC', 1);
    const usdcToSol = await router.getRaydiumQuote('USDC', 'SOL', 1);

    // Reverse pairs should have inverse relationship (approximately)
    expect(solToUsdc.price * usdcToSol.price).toBeCloseTo(1, 0);
  });
});