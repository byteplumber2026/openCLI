// tests/providers/deepseek.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeepSeekProvider } from '../../src/providers/deepseek.js';

vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: vi.fn(),
        },
      },
    })),
  };
});

describe('DeepSeekProvider', () => {
  let provider: DeepSeekProvider;

  beforeEach(() => {
    provider = new DeepSeekProvider('ds-test');
  });

  it('has correct name', () => {
    expect(provider.name).toBe('deepseek');
  });

  it('has correct env var', () => {
    expect(provider.envVar).toBe('DEEPSEEK_API_KEY');
  });

  it('lists available models', () => {
    const models = provider.listModels();
    expect(models.length).toBe(2);
    expect(models.find(m => m.id === 'deepseek-chat')).toBeDefined();
    expect(models.find(m => m.id === 'deepseek-reasoner')).toBeDefined();
  });

  it('all models have positive context windows', () => {
    const models = provider.listModels();
    for (const m of models) {
      expect(m.contextWindow).toBeGreaterThan(0);
    }
  });
});
