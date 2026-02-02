// tests/cli/prompt.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getProviderChoices } from '../../src/cli/prompt.js';

describe('Provider Selection', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns available providers with keys', () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    process.env.XAI_API_KEY = 'xai-test';

    const choices = getProviderChoices();
    const available = choices.filter(c => !c.disabled);

    expect(available.length).toBe(2);
    expect(available.map(c => c.value)).toContain('openai');
    expect(available.map(c => c.value)).toContain('grok');
  });

  it('marks providers without keys as disabled', () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    delete process.env.MINIMAX_API_KEY;

    const choices = getProviderChoices();
    const minimax = choices.find(c => c.value === 'minimax');

    expect(minimax?.disabled).toBeTruthy();
  });
});
