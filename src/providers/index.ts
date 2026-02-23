// src/providers/index.ts
export * from './types.js';
export { OpenAIProvider } from './openai.js';
export { GrokProvider } from './grok.js';
export { MinimaxProvider } from './minimax.js';
export { GeminiProvider } from './gemini.js';
export { DeepSeekProvider } from './deepseek.js';
export { OpenRouterProvider } from './openrouter.js';

import type { Provider } from './types.js';
import { OpenAIProvider } from './openai.js';
import { GrokProvider } from './grok.js';
import { MinimaxProvider } from './minimax.js';
import { GeminiProvider } from './gemini.js';
import { DeepSeekProvider } from './deepseek.js';
import { OpenRouterProvider } from './openrouter.js';
import { getApiKey } from '../config/env.js';

export function createProvider(name: string, apiKey: string): Provider {
  switch (name) {
    case 'openai':
      return new OpenAIProvider(apiKey);
    case 'grok':
      return new GrokProvider(apiKey);
    case 'minimax':
      return new MinimaxProvider(apiKey);
    case 'gemini':
      return new GeminiProvider(apiKey);
    case 'deepseek':
      return new DeepSeekProvider(apiKey);
    case 'openrouter':
      return new OpenRouterProvider(apiKey);
    default:
      throw new Error(`Unknown provider: ${name}`);
  }
}

export function getProviderForEnv(name: string): Provider | undefined {
  const apiKey = getApiKey(name);
  if (!apiKey) return undefined;
  return createProvider(name, apiKey);
}
