// tests/providers/minimax.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { MinimaxProvider } from '../../src/providers/minimax.js';

describe('MinimaxProvider', () => {
  let provider: MinimaxProvider;

  beforeEach(() => {
    provider = new MinimaxProvider('minimax-test');
  });

  it('has correct name', () => {
    expect(provider.name).toBe('minimax');
  });

  it('has correct env var', () => {
    expect(provider.envVar).toBe('MINIMAX_API_KEY');
  });

  it('lists available models', () => {
    const models = provider.listModels();
    expect(models.length).toBeGreaterThan(0);
    expect(models.find(m => m.id === 'abab6.5-chat')).toBeDefined();
  });
});
