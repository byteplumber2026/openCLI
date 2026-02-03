import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeminiProvider } from '../../src/providers/gemini.js';

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

describe('GeminiProvider', () => {
  let provider: GeminiProvider;

  beforeEach(() => {
    provider = new GeminiProvider('google-test');
  });

  it('has correct name', () => {
    expect(provider.name).toBe('gemini');
  });

  it('has correct env var', () => {
    expect(provider.envVar).toBe('GOOGLE_API_KEY');
  });

  it('lists available models', () => {
    const models = provider.listModels();
    expect(models.length).toBeGreaterThan(0);
    expect(models.find(m => m.id === 'gemini-2.0-flash')).toBeDefined();
  });
});
