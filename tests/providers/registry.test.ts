// tests/providers/registry.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createProvider, getProviderForEnv } from '../../src/providers/index.js';

describe('Provider Registry', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('creates OpenAI provider', () => {
    const provider = createProvider('openai', 'sk-test');
    expect(provider.name).toBe('openai');
  });

  it('creates Grok provider', () => {
    const provider = createProvider('grok', 'xai-test');
    expect(provider.name).toBe('grok');
  });

  it('creates Minimax provider', () => {
    const provider = createProvider('minimax', 'mm-test');
    expect(provider.name).toBe('minimax');
  });

  it('throws for unknown provider', () => {
    expect(() => createProvider('unknown', 'key')).toThrow();
  });

  it('gets provider from env', () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    const provider = getProviderForEnv('openai');
    expect(provider?.name).toBe('openai');
  });

  it('returns undefined for missing env', () => {
    delete process.env.OPENAI_API_KEY;
    const provider = getProviderForEnv('openai');
    expect(provider).toBeUndefined();
  });
});
