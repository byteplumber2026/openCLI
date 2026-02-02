// src/providers/index.ts
export * from './types.js';
export { OpenAIProvider } from './openai.js';
export { GrokProvider } from './grok.js';
export { MinimaxProvider } from './minimax.js';

import type { Provider } from './types.js';
import { OpenAIProvider } from './openai.js';
import { GrokProvider } from './grok.js';
import { MinimaxProvider } from './minimax.js';
import { getApiKey } from '../config/env.js';

export function createProvider(name: string, apiKey: string): Provider {
  switch (name) {
    case 'openai':
      return new OpenAIProvider(apiKey);
    case 'grok':
      return new GrokProvider(apiKey);
    case 'minimax':
      return new MinimaxProvider(apiKey);
    default:
      throw new Error(`Unknown provider: ${name}`);
  }
}

export function getProviderForEnv(name: string): Provider | undefined {
  const apiKey = getApiKey(name);
  if (!apiKey) return undefined;
  return createProvider(name, apiKey);
}
