import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getAvailableProviders, getApiKey } from '../../src/config/env.js';

describe('env', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('detects available providers from env', () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    process.env.XAI_API_KEY = 'xai-test';

    const providers = getAvailableProviders();
    expect(providers).toContain('openai');
    expect(providers).toContain('grok');
    expect(providers).not.toContain('minimax');
  });

  it('returns api key for provider', () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    expect(getApiKey('openai')).toBe('sk-test');
  });

  it('returns undefined for missing key', () => {
    delete process.env.OPENAI_API_KEY;
    expect(getApiKey('openai')).toBeUndefined();
  });
});
