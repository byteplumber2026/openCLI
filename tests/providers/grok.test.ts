// tests/providers/grok.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GrokProvider } from '../../src/providers/grok.js';

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

describe('GrokProvider', () => {
  let provider: GrokProvider;

  beforeEach(() => {
    provider = new GrokProvider('xai-test');
  });

  it('has correct name', () => {
    expect(provider.name).toBe('grok');
  });

  it('has correct env var', () => {
    expect(provider.envVar).toBe('XAI_API_KEY');
  });

  it('lists available models', () => {
    const models = provider.listModels();
    expect(models.length).toBeGreaterThan(0);
    expect(models.find(m => m.id === 'grok-2')).toBeDefined();
  });
});
