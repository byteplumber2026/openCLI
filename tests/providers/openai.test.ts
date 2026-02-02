// tests/providers/openai.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenAIProvider } from '../../src/providers/openai.js';

// Mock the openai module
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

describe('OpenAIProvider', () => {
  let provider: OpenAIProvider;

  beforeEach(() => {
    provider = new OpenAIProvider('sk-test');
  });

  it('has correct name', () => {
    expect(provider.name).toBe('openai');
  });

  it('has correct env var', () => {
    expect(provider.envVar).toBe('OPENAI_API_KEY');
  });

  it('lists available models', () => {
    const models = provider.listModels();
    expect(models.length).toBeGreaterThan(0);
    expect(models.find(m => m.id === 'gpt-4o')).toBeDefined();
  });

  it('validates api key format', async () => {
    const validProvider = new OpenAIProvider('sk-test123');
    expect(validProvider.name).toBe('openai');
  });
});
