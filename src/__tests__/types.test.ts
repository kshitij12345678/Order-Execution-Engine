import { OrderType, OrderStatus, DexType } from '../types';

describe('Types Validation', () => {
  test('should have correct order types', () => {
    expect(OrderType.MARKET).toBe('market');
    expect(OrderType.LIMIT).toBe('limit');
    expect(OrderType.SNIPER).toBe('sniper');
  });

  test('should have correct order statuses', () => {
    expect(OrderStatus.PENDING).toBe('pending');
    expect(OrderStatus.ROUTING).toBe('routing');
    expect(OrderStatus.BUILDING).toBe('building');
    expect(OrderStatus.SUBMITTED).toBe('submitted');
    expect(OrderStatus.CONFIRMED).toBe('confirmed');
    expect(OrderStatus.FAILED).toBe('failed');
  });

  test('should have correct DEX types', () => {
    expect(DexType.RAYDIUM).toBe('raydium');
    expect(DexType.METEORA).toBe('meteora');
  });
});