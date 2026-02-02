// tests/integration/cli.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getAvailableProviders } from '../../src/config/env.js';
import { createProvider } from '../../src/providers/index.js';

describe('CLI Integration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('detects and creates providers from env', () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    process.env.XAI_API_KEY = 'xai-test';

    const available = getAvailableProviders();
    expect(available).toContain('openai');
    expect(available).toContain('grok');

    const openai = createProvider('openai', 'sk-test');
    const grok = createProvider('grok', 'xai-test');

    expect(openai.name).toBe('openai');
    expect(grok.name).toBe('grok');
  });

  it('provider lists models', () => {
    const provider = createProvider('openai', 'sk-test');
    const models = provider.listModels();

    expect(models.length).toBeGreaterThan(0);
    expect(models[0]).toHaveProperty('id');
    expect(models[0]).toHaveProperty('name');
    expect(models[0]).toHaveProperty('contextWindow');
  });
});
