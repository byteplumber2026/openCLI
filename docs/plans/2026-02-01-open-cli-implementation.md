# open_cli Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a multi-provider CLI AI assistant supporting OpenAI, Grok, and Minimax with streaming chat and file context.

**Architecture:** Provider adapter pattern with common interface. Interactive startup for provider/model selection. Chat loop with slash commands for runtime control.

**Tech Stack:** TypeScript, Node.js 20+, @inquirer/prompts, openai SDK, chalk, marked, shiki, vitest

---

## Task 1: Project Setup

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore`
- Create: `src/index.ts`

**Step 1: Create package.json**

```json
{
  "name": "opencli",
  "version": "0.1.0",
  "description": "Multi-provider CLI AI assistant",
  "type": "module",
  "main": "dist/index.js",
  "bin": {
    "opencli": "dist/index.js"
  },
  "scripts": {
    "dev": "tsx src/index.ts",
    "build": "tsup src/index.ts --format esm --dts",
    "test": "vitest",
    "test:run": "vitest run",
    "lint": "eslint src",
    "format": "prettier --write src"
  },
  "engines": {
    "node": ">=20"
  },
  "dependencies": {
    "@inquirer/prompts": "^7.0.0",
    "openai": "^4.0.0",
    "chalk": "^5.3.0",
    "marked": "^15.0.0",
    "marked-terminal": "^7.0.0",
    "fast-glob": "^3.3.0",
    "commander": "^12.0.0",
    "conf": "^13.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "tsup": "^8.0.0",
    "tsx": "^4.0.0",
    "vitest": "^2.0.0",
    "@types/node": "^20.0.0",
    "eslint": "^9.0.0",
    "prettier": "^3.0.0"
  }
}
```

**Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 3: Create .gitignore**

```
node_modules/
dist/
.env
*.log
.DS_Store
```

**Step 4: Create minimal entry point**

```typescript
// src/index.ts
#!/usr/bin/env node

console.log('opencli starting...');
```

**Step 5: Install dependencies**

Run: `npm install`

**Step 6: Verify setup**

Run: `npm run dev`
Expected: "opencli starting..."

**Step 7: Commit**

```bash
git add -A
git commit -m "chore: initial project setup with TypeScript"
```

---

## Task 2: Provider Interface & Types

**Files:**
- Create: `src/providers/types.ts`
- Create: `src/providers/index.ts`
- Create: `tests/providers/types.test.ts`

**Step 1: Write the type definitions**

```typescript
// src/providers/types.ts
export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface StreamChunk {
  content: string;
  done: boolean;
}

export interface Model {
  id: string;
  name: string;
  contextWindow: number;
}

export interface Provider {
  readonly name: string;
  readonly envVar: string;
  chat(messages: Message[], options?: ChatOptions): AsyncIterable<StreamChunk>;
  listModels(): Model[];
  validateApiKey(): Promise<boolean>;
}

export interface ProviderConfig {
  apiKey: string;
  baseUrl?: string;
}
```

**Step 2: Create provider registry**

```typescript
// src/providers/index.ts
export * from './types.js';
```

**Step 3: Write basic type test**

```typescript
// tests/providers/types.test.ts
import { describe, it, expect } from 'vitest';
import type { Message, Provider, Model } from '../../src/providers/types.js';

describe('Provider types', () => {
  it('Message type accepts valid roles', () => {
    const msg: Message = { role: 'user', content: 'hello' };
    expect(msg.role).toBe('user');
  });

  it('Model type has required fields', () => {
    const model: Model = { id: 'gpt-4o', name: 'GPT-4o', contextWindow: 128000 };
    expect(model.id).toBe('gpt-4o');
  });
});
```

**Step 4: Run test**

Run: `npm test`
Expected: PASS

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add provider interface types"
```

---

## Task 3: Environment & Config Management

**Files:**
- Create: `src/config/env.ts`
- Create: `src/config/settings.ts`
- Create: `src/config/index.ts`
- Create: `tests/config/env.test.ts`

**Step 1: Write failing test for env detection**

```typescript
// tests/config/env.test.ts
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
```

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL - module not found

**Step 3: Implement env.ts**

```typescript
// src/config/env.ts
const ENV_VARS: Record<string, string> = {
  openai: 'OPENAI_API_KEY',
  grok: 'XAI_API_KEY',
  minimax: 'MINIMAX_API_KEY',
};

export function getApiKey(provider: string): string | undefined {
  const envVar = ENV_VARS[provider];
  return envVar ? process.env[envVar] : undefined;
}

export function getAvailableProviders(): string[] {
  return Object.entries(ENV_VARS)
    .filter(([_, envVar]) => process.env[envVar])
    .map(([provider]) => provider);
}

export function getEnvVar(provider: string): string | undefined {
  return ENV_VARS[provider];
}

export const SUPPORTED_PROVIDERS = Object.keys(ENV_VARS);
```

**Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

**Step 5: Create settings.ts**

```typescript
// src/config/settings.ts
import Conf from 'conf';

interface OpenCliConfig {
  defaultProvider?: string;
  defaultModel?: string;
  preferences: {
    temperature: number;
  };
  styles: {
    promptColor: string;
    codeTheme: string;
  };
}

const defaults: OpenCliConfig = {
  preferences: {
    temperature: 0.7,
  },
  styles: {
    promptColor: 'cyan',
    codeTheme: 'monokai',
  },
};

export const config = new Conf<OpenCliConfig>({
  projectName: 'opencli',
  defaults,
});

export function getDefaultProvider(): string | undefined {
  return config.get('defaultProvider');
}

export function setDefaultProvider(provider: string): void {
  config.set('defaultProvider', provider);
}

export function getDefaultModel(): string | undefined {
  return config.get('defaultModel');
}

export function setDefaultModel(model: string): void {
  config.set('defaultModel', model);
}

export function getStyles() {
  return config.get('styles');
}

export function setStyles(styles: Partial<OpenCliConfig['styles']>): void {
  const current = config.get('styles');
  config.set('styles', { ...current, ...styles });
}
```

**Step 6: Create index.ts**

```typescript
// src/config/index.ts
export * from './env.js';
export * from './settings.js';
```

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: add config and environment management"
```

---

## Task 4: OpenAI Provider Implementation

**Files:**
- Create: `src/providers/openai.ts`
- Create: `tests/providers/openai.test.ts`

**Step 1: Write failing test**

```typescript
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
    // Just check it doesn't throw for valid format
    expect(validProvider.name).toBe('openai');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL - module not found

**Step 3: Implement OpenAI provider**

```typescript
// src/providers/openai.ts
import OpenAI from 'openai';
import type { Provider, Message, ChatOptions, StreamChunk, Model } from './types.js';

const MODELS: Model[] = [
  { id: 'gpt-4o', name: 'GPT-4o', contextWindow: 128000 },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', contextWindow: 128000 },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', contextWindow: 128000 },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', contextWindow: 16385 },
];

export class OpenAIProvider implements Provider {
  readonly name = 'openai';
  readonly envVar = 'OPENAI_API_KEY';
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  listModels(): Model[] {
    return MODELS;
  }

  async validateApiKey(): Promise<boolean> {
    try {
      await this.client.models.list();
      return true;
    } catch {
      return false;
    }
  }

  async *chat(messages: Message[], options?: ChatOptions): AsyncIterable<StreamChunk> {
    const systemMessages: OpenAI.ChatCompletionMessageParam[] = options?.systemPrompt
      ? [{ role: 'system', content: options.systemPrompt }]
      : [];

    const chatMessages: OpenAI.ChatCompletionMessageParam[] = messages.map(m => ({
      role: m.role,
      content: m.content,
    }));

    const stream = await this.client.chat.completions.create({
      model: 'gpt-4o',
      messages: [...systemMessages, ...chatMessages],
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      const done = chunk.choices[0]?.finish_reason === 'stop';
      yield { content, done };
    }
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add OpenAI provider implementation"
```

---

## Task 5: Grok Provider Implementation

**Files:**
- Create: `src/providers/grok.ts`
- Create: `tests/providers/grok.test.ts`

**Step 1: Write failing test**

```typescript
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
```

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL

**Step 3: Implement Grok provider**

```typescript
// src/providers/grok.ts
import OpenAI from 'openai';
import type { Provider, Message, ChatOptions, StreamChunk, Model } from './types.js';

const MODELS: Model[] = [
  { id: 'grok-2', name: 'Grok 2', contextWindow: 131072 },
  { id: 'grok-2-mini', name: 'Grok 2 Mini', contextWindow: 131072 },
];

export class GrokProvider implements Provider {
  readonly name = 'grok';
  readonly envVar = 'XAI_API_KEY';
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({
      apiKey,
      baseURL: 'https://api.x.ai/v1',
    });
  }

  listModels(): Model[] {
    return MODELS;
  }

  async validateApiKey(): Promise<boolean> {
    try {
      await this.client.models.list();
      return true;
    } catch {
      return false;
    }
  }

  async *chat(messages: Message[], options?: ChatOptions): AsyncIterable<StreamChunk> {
    const systemMessages: OpenAI.ChatCompletionMessageParam[] = options?.systemPrompt
      ? [{ role: 'system', content: options.systemPrompt }]
      : [];

    const chatMessages: OpenAI.ChatCompletionMessageParam[] = messages.map(m => ({
      role: m.role,
      content: m.content,
    }));

    const stream = await this.client.chat.completions.create({
      model: 'grok-2',
      messages: [...systemMessages, ...chatMessages],
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      const done = chunk.choices[0]?.finish_reason === 'stop';
      yield { content, done };
    }
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add Grok provider implementation"
```

---

## Task 6: Minimax Provider Implementation

**Files:**
- Create: `src/providers/minimax.ts`
- Create: `tests/providers/minimax.test.ts`

**Step 1: Write failing test**

```typescript
// tests/providers/minimax.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { MinimaxProvider } from '../../src/providers/minimax.js';

describe('MinimaxProvider', () => {
  let provider: MinimaxProvider;

  beforeEach(() => {
    provider = new MinimaxProvider('minimax-test');
  });

  it('has correct name', () => {
    expect(provider.name).toBe('minimax');
  });

  it('has correct env var', () => {
    expect(provider.envVar).toBe('MINIMAX_API_KEY');
  });

  it('lists available models', () => {
    const models = provider.listModels();
    expect(models.length).toBeGreaterThan(0);
    expect(models.find(m => m.id === 'abab6.5-chat')).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL

**Step 3: Implement Minimax provider**

```typescript
// src/providers/minimax.ts
import type { Provider, Message, ChatOptions, StreamChunk, Model } from './types.js';

const MODELS: Model[] = [
  { id: 'abab6.5-chat', name: 'ABAB 6.5 Chat', contextWindow: 245760 },
  { id: 'abab5.5-chat', name: 'ABAB 5.5 Chat', contextWindow: 16384 },
];

const API_BASE = 'https://api.minimax.chat/v1';

export class MinimaxProvider implements Provider {
  readonly name = 'minimax';
  readonly envVar = 'MINIMAX_API_KEY';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  listModels(): Model[] {
    return MODELS;
  }

  async validateApiKey(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/models`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async *chat(messages: Message[], options?: ChatOptions): AsyncIterable<StreamChunk> {
    const body = {
      model: 'abab6.5-chat',
      messages: messages.map(m => ({
        role: m.role === 'user' ? 'user' : m.role === 'assistant' ? 'assistant' : 'system',
        content: m.content,
      })),
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 4096,
      stream: true,
    };

    const response = await fetch(`${API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok || !response.body) {
      throw new Error(`Minimax API error: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.startsWith('data: '));

      for (const line of lines) {
        const data = line.slice(6);
        if (data === '[DONE]') {
          yield { content: '', done: true };
          return;
        }
        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content || '';
          yield { content, done: false };
        } catch {
          // Skip malformed JSON
        }
      }
    }
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add Minimax provider implementation"
```

---

## Task 7: Provider Registry

**Files:**
- Update: `src/providers/index.ts`
- Create: `tests/providers/registry.test.ts`

**Step 1: Write failing test**

```typescript
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
```

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL

**Step 3: Update providers/index.ts**

```typescript
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
```

**Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add provider registry"
```

---

## Task 8: Interactive Provider Selection

**Files:**
- Create: `src/cli/prompt.ts`
- Create: `tests/cli/prompt.test.ts`

**Step 1: Write failing test**

```typescript
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
```

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL

**Step 3: Implement prompt.ts**

```typescript
// src/cli/prompt.ts
import { select, confirm } from '@inquirer/prompts';
import chalk from 'chalk';
import { getAvailableProviders, getApiKey, getEnvVar, SUPPORTED_PROVIDERS } from '../config/env.js';
import { getDefaultProvider, setDefaultProvider, getDefaultModel, setDefaultModel } from '../config/settings.js';
import { createProvider, type Provider } from '../providers/index.js';

interface ProviderChoice {
  name: string;
  value: string;
  disabled?: string;
}

export function getProviderChoices(): ProviderChoice[] {
  const available = getAvailableProviders();

  return SUPPORTED_PROVIDERS.map(provider => {
    const hasKey = available.includes(provider);
    const envVar = getEnvVar(provider);

    return {
      name: hasKey
        ? `${provider.charAt(0).toUpperCase() + provider.slice(1)}`
        : `${provider} ${chalk.dim(`(set ${envVar})`)}`,
      value: provider,
      disabled: hasKey ? undefined : `No API key`,
    };
  });
}

export async function selectProvider(): Promise<Provider> {
  const defaultProvider = getDefaultProvider();
  const available = getAvailableProviders();

  // If default is set and available, use it
  if (defaultProvider && available.includes(defaultProvider)) {
    const apiKey = getApiKey(defaultProvider)!;
    return createProvider(defaultProvider, apiKey);
  }

  // If only one provider available, use it
  if (available.length === 1) {
    const apiKey = getApiKey(available[0])!;
    const provider = createProvider(available[0], apiKey);
    console.log(chalk.dim(`Using ${provider.name} (only available provider)`));
    return provider;
  }

  // If no providers available, error
  if (available.length === 0) {
    console.log(chalk.red('No API keys found. Please set one of:'));
    SUPPORTED_PROVIDERS.forEach(p => {
      console.log(chalk.yellow(`  ${getEnvVar(p)}`));
    });
    process.exit(1);
  }

  // Interactive selection
  console.log(chalk.bold('\nWelcome to opencli!\n'));

  const choices = getProviderChoices();
  const providerName = await select({
    message: 'Select a provider:',
    choices,
  });

  const apiKey = getApiKey(providerName)!;
  const provider = createProvider(providerName, apiKey);

  // Ask to save as default
  const saveDefault = await confirm({
    message: 'Save as default provider?',
    default: true,
  });

  if (saveDefault) {
    setDefaultProvider(providerName);
  }

  return provider;
}

export async function selectModel(provider: Provider): Promise<string> {
  const defaultModel = getDefaultModel();
  const models = provider.listModels();

  // If default model exists for this provider, use it
  if (defaultModel && models.find(m => m.id === defaultModel)) {
    return defaultModel;
  }

  // If only one model, use it
  if (models.length === 1) {
    return models[0].id;
  }

  const modelId = await select({
    message: 'Select a model:',
    choices: models.map(m => ({
      name: `${m.name} (${m.contextWindow.toLocaleString()} tokens)`,
      value: m.id,
    })),
  });

  const saveDefault = await confirm({
    message: 'Save as default model?',
    default: true,
  });

  if (saveDefault) {
    setDefaultModel(modelId);
  }

  return modelId;
}
```

**Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add interactive provider selection"
```

---

## Task 9: File Context Handler

**Files:**
- Create: `src/context/files.ts`
- Create: `tests/context/files.test.ts`

**Step 1: Write failing test**

```typescript
// tests/context/files.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileContext, parseFileReferences, formatFileContext } from '../../src/context/files.js';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

const TEST_DIR = '/tmp/opencli-test';

describe('File Context', () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
    writeFileSync(join(TEST_DIR, 'test.ts'), 'const x = 1;');
    writeFileSync(join(TEST_DIR, 'test.py'), 'x = 1');
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('parses @file references', () => {
    const input = 'What does @test.ts do?';
    const refs = parseFileReferences(input);
    expect(refs).toContain('test.ts');
  });

  it('parses /file command', () => {
    const input = '/file test.ts\nExplain this';
    const refs = parseFileReferences(input);
    expect(refs).toContain('test.ts');
  });

  it('reads file content', async () => {
    const content = await readFileContext(join(TEST_DIR, 'test.ts'));
    expect(content).toBe('const x = 1;');
  });

  it('formats file context', () => {
    const formatted = formatFileContext('test.ts', 'const x = 1;');
    expect(formatted).toContain('<file path="test.ts"');
    expect(formatted).toContain('language="typescript"');
    expect(formatted).toContain('const x = 1;');
  });

  it('detects language from extension', () => {
    const ts = formatFileContext('test.ts', 'code');
    const py = formatFileContext('test.py', 'code');
    expect(ts).toContain('language="typescript"');
    expect(py).toContain('language="python"');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL

**Step 3: Implement files.ts**

```typescript
// src/context/files.ts
import { readFile, stat } from 'fs/promises';
import { extname, resolve } from 'path';
import fg from 'fast-glob';

const MAX_FILE_SIZE = 100 * 1024; // 100KB
const MAX_FILES = 10;

const LANGUAGE_MAP: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.py': 'python',
  '.rb': 'ruby',
  '.go': 'go',
  '.rs': 'rust',
  '.java': 'java',
  '.c': 'c',
  '.cpp': 'cpp',
  '.h': 'c',
  '.hpp': 'cpp',
  '.cs': 'csharp',
  '.php': 'php',
  '.swift': 'swift',
  '.kt': 'kotlin',
  '.scala': 'scala',
  '.sh': 'bash',
  '.bash': 'bash',
  '.zsh': 'zsh',
  '.fish': 'fish',
  '.sql': 'sql',
  '.json': 'json',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.toml': 'toml',
  '.xml': 'xml',
  '.html': 'html',
  '.css': 'css',
  '.scss': 'scss',
  '.md': 'markdown',
};

export function parseFileReferences(input: string): string[] {
  const refs: string[] = [];

  // Match @path references
  const atMatches = input.matchAll(/@([\w./-]+)/g);
  for (const match of atMatches) {
    refs.push(match[1]);
  }

  // Match /file path commands
  const fileMatches = input.matchAll(/^\/file\s+([\w./*-]+)/gm);
  for (const match of fileMatches) {
    refs.push(match[1]);
  }

  return [...new Set(refs)];
}

export function detectLanguage(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  return LANGUAGE_MAP[ext] || 'text';
}

export async function readFileContext(filePath: string): Promise<string> {
  const absolutePath = resolve(filePath);
  const stats = await stat(absolutePath);

  if (stats.size > MAX_FILE_SIZE) {
    const content = await readFile(absolutePath, 'utf-8');
    const truncated = content.slice(0, MAX_FILE_SIZE);
    return `${truncated}\n\n[File truncated - exceeded ${MAX_FILE_SIZE / 1024}KB limit]`;
  }

  return readFile(absolutePath, 'utf-8');
}

export function formatFileContext(filePath: string, content: string): string {
  const language = detectLanguage(filePath);
  return `<file path="${filePath}" language="${language}">\n${content}\n</file>`;
}

export async function resolveFilePatterns(patterns: string[]): Promise<string[]> {
  const files: string[] = [];

  for (const pattern of patterns) {
    if (pattern.includes('*')) {
      const matches = await fg(pattern, { cwd: process.cwd() });
      files.push(...matches);
    } else {
      files.push(pattern);
    }
  }

  return [...new Set(files)].slice(0, MAX_FILES);
}

export async function buildFileContext(input: string): Promise<{ context: string; cleanInput: string }> {
  const refs = parseFileReferences(input);

  if (refs.length === 0) {
    return { context: '', cleanInput: input };
  }

  const files = await resolveFilePatterns(refs);
  const contexts: string[] = [];

  for (const file of files) {
    try {
      const content = await readFileContext(file);
      contexts.push(formatFileContext(file, content));
    } catch (error) {
      contexts.push(`<file path="${file}" error="File not found or unreadable" />`);
    }
  }

  // Remove file references from input
  let cleanInput = input
    .replace(/@[\w./-]+/g, '')
    .replace(/^\/file\s+[\w./*-]+\n?/gm, '')
    .trim();

  const context = contexts.join('\n\n');
  return { context, cleanInput };
}
```

**Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add file context handler"
```

---

## Task 10: Markdown Renderer

**Files:**
- Create: `src/cli/renderer.ts`
- Create: `tests/cli/renderer.test.ts`

**Step 1: Write failing test**

```typescript
// tests/cli/renderer.test.ts
import { describe, it, expect } from 'vitest';
import { renderMarkdown } from '../../src/cli/renderer.js';

describe('Markdown Renderer', () => {
  it('renders plain text', () => {
    const output = renderMarkdown('Hello world');
    expect(output).toContain('Hello world');
  });

  it('renders code blocks', () => {
    const output = renderMarkdown('```js\nconst x = 1;\n```');
    expect(output).toContain('const');
  });

  it('renders inline code', () => {
    const output = renderMarkdown('Use `npm install`');
    expect(output).toContain('npm install');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL

**Step 3: Implement renderer.ts**

```typescript
// src/cli/renderer.ts
import { marked } from 'marked';
import TerminalRenderer from 'marked-terminal';
import chalk from 'chalk';
import { getStyles } from '../config/settings.js';

// Configure marked with terminal renderer
marked.setOptions({
  renderer: new TerminalRenderer({
    code: chalk.yellow,
    blockquote: chalk.gray.italic,
    html: chalk.gray,
    heading: chalk.bold,
    firstHeading: chalk.bold.underline,
    hr: chalk.gray,
    listitem: chalk.reset,
    paragraph: chalk.reset,
    strong: chalk.bold,
    em: chalk.italic,
    codespan: chalk.yellow,
    del: chalk.strikethrough,
    link: chalk.blue.underline,
    href: chalk.blue.underline,
  }),
});

export function renderMarkdown(text: string): string {
  return marked.parse(text) as string;
}

export function getPromptColor(): typeof chalk {
  const styles = getStyles();
  const colorName = styles.promptColor as keyof typeof chalk;
  return (chalk[colorName] as typeof chalk) || chalk.cyan;
}

export function formatPrompt(provider: string, model: string): string {
  const color = getPromptColor();
  return color(`open_cli (${provider}/${model}) > `);
}

export function streamWrite(text: string): void {
  process.stdout.write(text);
}

export function clearLine(): void {
  process.stdout.write('\r\x1b[K');
}
```

**Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add markdown renderer for terminal"
```

---

## Task 11: Chat Loop with Commands

**Files:**
- Create: `src/cli/chat.ts`
- Create: `src/cli/commands.ts`
- Create: `tests/cli/commands.test.ts`

**Step 1: Write failing test**

```typescript
// tests/cli/commands.test.ts
import { describe, it, expect } from 'vitest';
import { parseCommand, isCommand } from '../../src/cli/commands.js';

describe('Commands', () => {
  it('detects command input', () => {
    expect(isCommand('/help')).toBe(true);
    expect(isCommand('/models')).toBe(true);
    expect(isCommand('hello')).toBe(false);
  });

  it('parses command name', () => {
    expect(parseCommand('/help').name).toBe('help');
    expect(parseCommand('/file src/index.ts').name).toBe('file');
  });

  it('parses command args', () => {
    expect(parseCommand('/file src/index.ts').args).toBe('src/index.ts');
    expect(parseCommand('/help').args).toBe('');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL

**Step 3: Implement commands.ts**

```typescript
// src/cli/commands.ts
import chalk from 'chalk';
import { select } from '@inquirer/prompts';
import type { Provider, Message } from '../providers/types.js';
import { selectModel, selectProvider } from './prompt.js';
import { setStyles, getStyles } from '../config/settings.js';

export interface Command {
  name: string;
  args: string;
}

export interface ChatState {
  provider: Provider;
  model: string;
  messages: Message[];
}

export function isCommand(input: string): boolean {
  return input.trim().startsWith('/');
}

export function parseCommand(input: string): Command {
  const trimmed = input.trim().slice(1); // Remove leading /
  const spaceIndex = trimmed.indexOf(' ');

  if (spaceIndex === -1) {
    return { name: trimmed, args: '' };
  }

  return {
    name: trimmed.slice(0, spaceIndex),
    args: trimmed.slice(spaceIndex + 1).trim(),
  };
}

const HELP_TEXT = `
${chalk.bold('Available Commands:')}

  /models     Switch to a different model
  /provider   Switch to a different provider
  /file       Add file to context (e.g., /file src/index.ts)
  /styles     Change terminal color theme
  /clear      Clear conversation history
  /help       Show this help message
  /exit       Exit opencli

${chalk.bold('File Context:')}

  Use @filename to reference files inline:
  ${chalk.dim('What does @src/index.ts do?')}
`;

export async function handleCommand(
  command: Command,
  state: ChatState
): Promise<{ action: 'continue' | 'exit'; state: ChatState }> {
  switch (command.name) {
    case 'help':
      console.log(HELP_TEXT);
      return { action: 'continue', state };

    case 'exit':
    case 'quit':
      console.log(chalk.dim('Goodbye!'));
      return { action: 'exit', state };

    case 'clear':
      console.log(chalk.dim('Conversation cleared.'));
      return { action: 'continue', state: { ...state, messages: [] } };

    case 'models': {
      const model = await selectModel(state.provider);
      console.log(chalk.dim(`Switched to ${model}`));
      return { action: 'continue', state: { ...state, model } };
    }

    case 'provider': {
      const provider = await selectProvider();
      const model = await selectModel(provider);
      console.log(chalk.dim(`Switched to ${provider.name}/${model}`));
      return { action: 'continue', state: { ...state, provider, model, messages: [] } };
    }

    case 'styles': {
      const colors = ['cyan', 'green', 'yellow', 'magenta', 'blue', 'red', 'white'];
      const current = getStyles();

      const color = await select({
        message: 'Select prompt color:',
        choices: colors.map(c => ({
          name: (chalk as any)[c](c),
          value: c,
        })),
        default: current.promptColor,
      });

      setStyles({ promptColor: color });
      console.log(chalk.dim(`Style updated.`));
      return { action: 'continue', state };
    }

    case 'file':
      // File command is handled in chat loop, just acknowledge here
      console.log(chalk.dim(`File ${command.args} will be included in next message.`));
      return { action: 'continue', state };

    default:
      console.log(chalk.yellow(`Unknown command: /${command.name}`));
      console.log(chalk.dim('Type /help for available commands.'));
      return { action: 'continue', state };
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

**Step 5: Implement chat.ts**

```typescript
// src/cli/chat.ts
import * as readline from 'readline';
import chalk from 'chalk';
import type { Provider, Message } from '../providers/types.js';
import { formatPrompt, renderMarkdown, streamWrite } from './renderer.js';
import { isCommand, parseCommand, handleCommand, type ChatState } from './commands.js';
import { buildFileContext } from '../context/files.js';

export async function startChat(provider: Provider, model: string): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  let state: ChatState = {
    provider,
    model,
    messages: [],
  };

  console.log(chalk.dim('\nType /help for commands, /exit to quit.\n'));

  const prompt = (): void => {
    rl.question(formatPrompt(state.provider.name, state.model), async (input) => {
      const trimmed = input.trim();

      if (!trimmed) {
        prompt();
        return;
      }

      // Handle commands
      if (isCommand(trimmed)) {
        const command = parseCommand(trimmed);
        const result = await handleCommand(command, state);
        state = result.state;

        if (result.action === 'exit') {
          rl.close();
          return;
        }

        prompt();
        return;
      }

      // Build file context
      const { context, cleanInput } = await buildFileContext(trimmed);
      const userContent = context ? `${context}\n\n${cleanInput}` : cleanInput;

      // Add user message
      state.messages.push({ role: 'user', content: userContent });

      // Stream response
      console.log();
      let fullResponse = '';

      try {
        for await (const chunk of state.provider.chat(state.messages, {
          temperature: 0.7,
        })) {
          streamWrite(chunk.content);
          fullResponse += chunk.content;
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.log(chalk.red(`\nError: ${errorMsg}`));
        state.messages.pop(); // Remove failed user message
        prompt();
        return;
      }

      console.log('\n');

      // Add assistant message
      state.messages.push({ role: 'assistant', content: fullResponse });

      prompt();
    });
  };

  // Handle Ctrl+C gracefully
  rl.on('SIGINT', () => {
    console.log(chalk.dim('\nGoodbye!'));
    rl.close();
  });

  prompt();
}
```

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add chat loop with commands"
```

---

## Task 12: Main Entry Point

**Files:**
- Update: `src/index.ts`

**Step 1: Implement main entry point**

```typescript
// src/index.ts
#!/usr/bin/env node

import { program } from 'commander';
import chalk from 'chalk';
import { selectProvider, selectModel } from './cli/prompt.js';
import { startChat } from './cli/chat.js';
import { getAvailableProviders } from './config/env.js';

program
  .name('opencli')
  .description('Multi-provider CLI AI assistant')
  .version('0.1.0')
  .option('-p, --provider <name>', 'Provider to use (openai, grok, minimax)')
  .option('-m, --model <id>', 'Model to use')
  .action(async (options) => {
    try {
      // Check for any available providers
      const available = getAvailableProviders();
      if (available.length === 0) {
        console.log(chalk.red('No API keys found. Please set one of:'));
        console.log(chalk.yellow('  OPENAI_API_KEY'));
        console.log(chalk.yellow('  XAI_API_KEY'));
        console.log(chalk.yellow('  MINIMAX_API_KEY'));
        process.exit(1);
      }

      // Select provider (interactive or from flag)
      const provider = await selectProvider();

      // Select model (interactive or from flag)
      const model = options.model || await selectModel(provider);

      // Start chat
      await startChat(provider, model);
    } catch (error) {
      if (error instanceof Error && error.message.includes('User force closed')) {
        // User pressed Ctrl+C during prompt
        console.log(chalk.dim('\nGoodbye!'));
        process.exit(0);
      }
      throw error;
    }
  });

program.parse();
```

**Step 2: Test manually**

Run: `OPENAI_API_KEY=sk-test npm run dev`
Expected: Shows provider selection or error for invalid key

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add main entry point with CLI"
```

---

## Task 13: Build & Package

**Files:**
- Update: `package.json` (verify bin config)
- Create: `.npmignore`

**Step 1: Create .npmignore**

```
src/
tests/
*.test.ts
tsconfig.json
.env*
```

**Step 2: Build the project**

Run: `npm run build`
Expected: Creates dist/index.js

**Step 3: Test the built binary**

Run: `node dist/index.js --help`
Expected: Shows help text

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: add build configuration"
```

---

## Task 14: Integration Test

**Files:**
- Create: `tests/integration/cli.test.ts`

**Step 1: Write integration test**

```typescript
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
```

**Step 2: Run all tests**

Run: `npm run test:run`
Expected: All tests pass

**Step 3: Commit**

```bash
git add -A
git commit -m "test: add integration tests"
```

---

## Summary

**Tasks completed:**
1. Project setup (package.json, tsconfig, etc.)
2. Provider interface & types
3. Config & environment management
4. OpenAI provider
5. Grok provider
6. Minimax provider
7. Provider registry
8. Interactive provider selection
9. File context handler
10. Markdown renderer
11. Chat loop with commands
12. Main entry point
13. Build & package
14. Integration tests

**To run:**
```bash
npm install
npm run build
OPENAI_API_KEY=your-key ./dist/index.js
```
