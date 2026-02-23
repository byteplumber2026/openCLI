// tests/providers/openrouter.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenRouterProvider } from '../../src/providers/openrouter.js';

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

describe('OpenRouterProvider', () => {
  let provider: OpenRouterProvider;

  beforeEach(() => {
    provider = new OpenRouterProvider('sk-or-test');
  });

  it('has correct name', () => {
    expect(provider.name).toBe('openrouter');
  });

  it('has correct env var', () => {
    expect(provider.envVar).toBe('OPENROUTER_API_KEY');
  });

  it('lists 15 curated models', () => {
    const models = provider.listModels();
    expect(models.length).toBe(15);
  });

  it('includes Claude models', () => {
    const models = provider.listModels();
    expect(models.find(m => m.id === 'anthropic/claude-sonnet-4-5')).toBeDefined();
  });

  it('includes Llama models', () => {
    const models = provider.listModels();
    expect(models.find(m => m.id.startsWith('meta-llama/'))).toBeDefined();
  });

  it('all models have positive context windows', () => {
    const models = provider.listModels();
    for (const m of models) {
      expect(m.contextWindow).toBeGreaterThan(0);
    }
  });
});
