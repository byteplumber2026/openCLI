# New Providers Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add OpenRouter and DeepSeek as selectable providers, giving access to 15 curated models across major AI families.

**Architecture:** Both providers are OpenAI-compatible APIs and reuse the existing `openai` npm package with a custom `baseURL` — identical to the existing `GrokProvider` pattern. No new dependencies. Each provider gets its own file in `src/providers/`, then is registered in `src/providers/index.ts` and `src/config/env.ts`.

**Tech Stack:** TypeScript, `openai` npm package (already installed), vitest.

---

## Task 1: Create `src/providers/deepseek.ts`

**Files:**
- Create: `src/providers/deepseek.ts`
- Create: `tests/providers/deepseek.test.ts`

### Step 1: Write the failing test

Create `tests/providers/deepseek.test.ts`:

```typescript
// tests/providers/deepseek.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeepSeekProvider } from '../../src/providers/deepseek.js';

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

describe('DeepSeekProvider', () => {
  let provider: DeepSeekProvider;

  beforeEach(() => {
    provider = new DeepSeekProvider('ds-test');
  });

  it('has correct name', () => {
    expect(provider.name).toBe('deepseek');
  });

  it('has correct env var', () => {
    expect(provider.envVar).toBe('DEEPSEEK_API_KEY');
  });

  it('lists available models', () => {
    const models = provider.listModels();
    expect(models.length).toBe(2);
    expect(models.find(m => m.id === 'deepseek-chat')).toBeDefined();
    expect(models.find(m => m.id === 'deepseek-reasoner')).toBeDefined();
  });

  it('all models have positive context windows', () => {
    const models = provider.listModels();
    for (const m of models) {
      expect(m.contextWindow).toBeGreaterThan(0);
    }
  });
});
```

### Step 2: Run test to verify it fails

```bash
cd /home/lin/work/myproject/openCLI && npx vitest run tests/providers/deepseek.test.ts 2>&1 | tail -15
```

Expected: FAIL — `DeepSeekProvider` not found.

### Step 3: Implement `src/providers/deepseek.ts`

```typescript
// src/providers/deepseek.ts
import OpenAI from 'openai';
import type { Provider, Message, ChatOptions, StreamChunk, Model, ToolCall } from './types.js';

const MODELS: Model[] = [
  { id: 'deepseek-chat',     name: 'DeepSeek V3',  contextWindow: 65536 },
  { id: 'deepseek-reasoner', name: 'DeepSeek R1',  contextWindow: 65536 },
];

export class DeepSeekProvider implements Provider {
  readonly name = 'deepseek';
  readonly envVar = 'DEEPSEEK_API_KEY';
  private client: OpenAI;
  private model: string = 'deepseek-chat';

  constructor(apiKey: string) {
    this.client = new OpenAI({
      apiKey,
      baseURL: 'https://api.deepseek.com/v1',
    });
  }

  setModel(model: string): void {
    this.model = model;
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
    const openaiMessages: OpenAI.ChatCompletionMessageParam[] = [];

    if (options?.systemPrompt) {
      openaiMessages.push({ role: 'system', content: options.systemPrompt });
    }

    for (const m of messages) {
      if (m.role === 'tool') {
        openaiMessages.push({
          role: 'tool',
          content: m.content,
          tool_call_id: m.toolCallId!,
        });
      } else if (m.role === 'assistant' && m.toolCalls) {
        openaiMessages.push({
          role: 'assistant',
          content: m.content || null,
          tool_calls: m.toolCalls.map(tc => ({
            id: tc.id,
            type: 'function' as const,
            function: { name: tc.name, arguments: JSON.stringify(tc.arguments) },
          })),
        });
      } else {
        openaiMessages.push({ role: m.role as 'user' | 'assistant' | 'system', content: m.content });
      }
    }

    const tools = options?.tools?.map(t => ({
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }));

    const stream = await this.client.chat.completions.create({
      model: this.model,
      messages: openaiMessages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens,
      tools: tools?.length ? tools : undefined,
      stream: true,
    });

    const currentToolCalls: Map<number, { id: string; name: string; arguments: string }> = new Map();

    for await (const chunk of stream) {
      const choice = chunk.choices[0];
      if (!choice) continue;

      const content = choice.delta?.content || '';
      const toolCallDeltas = choice.delta?.tool_calls;

      if (toolCallDeltas) {
        for (const tc of toolCallDeltas) {
          if (!currentToolCalls.has(tc.index)) {
            currentToolCalls.set(tc.index, { id: tc.id || '', name: tc.function?.name || '', arguments: '' });
          }
          const current = currentToolCalls.get(tc.index)!;
          if (tc.id) current.id = tc.id;
          if (tc.function?.name) current.name = tc.function.name;
          if (tc.function?.arguments) current.arguments += tc.function.arguments;
        }
      }

      const done = choice.finish_reason === 'stop' || choice.finish_reason === 'tool_calls';

      if (done && currentToolCalls.size > 0) {
        const toolCalls: ToolCall[] = Array.from(currentToolCalls.values()).map(tc => ({
          id: tc.id,
          name: tc.name,
          arguments: JSON.parse(tc.arguments || '{}'),
        }));
        yield { content, done: true, toolCalls };
      } else {
        yield { content, done };
      }
    }
  }
}
```

### Step 4: Run test to verify it passes

```bash
cd /home/lin/work/myproject/openCLI && npx vitest run tests/providers/deepseek.test.ts 2>&1 | tail -15
```

Expected: 4/4 PASS.

### Step 5: Commit

```bash
cd /home/lin/work/myproject/openCLI && git add src/providers/deepseek.ts tests/providers/deepseek.test.ts && git commit -m "feat(providers): add DeepSeek provider (V3 + R1)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Create `src/providers/openrouter.ts`

**Files:**
- Create: `src/providers/openrouter.ts`
- Create: `tests/providers/openrouter.test.ts`

### Step 1: Write the failing test

Create `tests/providers/openrouter.test.ts`:

```typescript
// tests/providers/openrouter.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenRouterProvider } from '../../src/providers/openrouter.js';

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

describe('OpenRouterProvider', () => {
  let provider: OpenRouterProvider;

  beforeEach(() => {
    provider = new OpenRouterProvider('sk-or-test');
  });

  it('has correct name', () => {
    expect(provider.name).toBe('openrouter');
  });

  it('has correct env var', () => {
    expect(provider.envVar).toBe('OPENROUTER_API_KEY');
  });

  it('lists 15 curated models', () => {
    const models = provider.listModels();
    expect(models.length).toBe(15);
  });

  it('includes Claude models', () => {
    const models = provider.listModels();
    expect(models.find(m => m.id === 'anthropic/claude-sonnet-4-5')).toBeDefined();
  });

  it('includes Llama models', () => {
    const models = provider.listModels();
    expect(models.find(m => m.id.startsWith('meta-llama/'))).toBeDefined();
  });

  it('all models have positive context windows', () => {
    const models = provider.listModels();
    for (const m of models) {
      expect(m.contextWindow).toBeGreaterThan(0);
    }
  });
});
```

### Step 2: Run test to verify it fails

```bash
cd /home/lin/work/myproject/openCLI && npx vitest run tests/providers/openrouter.test.ts 2>&1 | tail -15
```

Expected: FAIL — `OpenRouterProvider` not found.

### Step 3: Implement `src/providers/openrouter.ts`

```typescript
// src/providers/openrouter.ts
import OpenAI from 'openai';
import type { Provider, Message, ChatOptions, StreamChunk, Model, ToolCall } from './types.js';

const MODELS: Model[] = [
  { id: 'anthropic/claude-opus-4-5',          name: 'Claude Opus 4.5',    contextWindow: 200000 },
  { id: 'anthropic/claude-sonnet-4-5',         name: 'Claude Sonnet 4.5',  contextWindow: 200000 },
  { id: 'anthropic/claude-haiku-4-5',          name: 'Claude Haiku 4.5',   contextWindow: 200000 },
  { id: 'meta-llama/llama-3.3-70b-instruct',   name: 'Llama 3.3 70B',      contextWindow: 131072 },
  { id: 'meta-llama/llama-3.1-405b-instruct',  name: 'Llama 3.1 405B',     contextWindow: 131072 },
  { id: 'google/gemini-2.0-flash-001',          name: 'Gemini 2.0 Flash',   contextWindow: 1048576 },
  { id: 'google/gemini-2.5-pro-preview',        name: 'Gemini 2.5 Pro',     contextWindow: 1048576 },
  { id: 'mistralai/mistral-large-2411',         name: 'Mistral Large',      contextWindow: 131072 },
  { id: 'mistralai/codestral-2501',             name: 'Codestral',          contextWindow: 262144 },
  { id: 'deepseek/deepseek-r1',                 name: 'DeepSeek R1',        contextWindow: 65536 },
  { id: 'deepseek/deepseek-chat-v3-0324',       name: 'DeepSeek V3',        contextWindow: 65536 },
  { id: 'x-ai/grok-3',                          name: 'Grok 3',             contextWindow: 131072 },
  { id: 'openai/gpt-4o',                        name: 'GPT-4o',             contextWindow: 128000 },
  { id: 'openai/o3-mini',                       name: 'o3-mini',            contextWindow: 200000 },
  { id: 'qwen/qwen-2.5-72b-instruct',           name: 'Qwen 2.5 72B',       contextWindow: 131072 },
];

export class OpenRouterProvider implements Provider {
  readonly name = 'openrouter';
  readonly envVar = 'OPENROUTER_API_KEY';
  private client: OpenAI;
  private model: string = 'anthropic/claude-sonnet-4-5';

  constructor(apiKey: string) {
    this.client = new OpenAI({
      apiKey,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': 'https://github.com/opencli',
        'X-Title': 'opencli',
      },
    });
  }

  setModel(model: string): void {
    this.model = model;
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
    const openaiMessages: OpenAI.ChatCompletionMessageParam[] = [];

    if (options?.systemPrompt) {
      openaiMessages.push({ role: 'system', content: options.systemPrompt });
    }

    for (const m of messages) {
      if (m.role === 'tool') {
        openaiMessages.push({
          role: 'tool',
          content: m.content,
          tool_call_id: m.toolCallId!,
        });
      } else if (m.role === 'assistant' && m.toolCalls) {
        openaiMessages.push({
          role: 'assistant',
          content: m.content || null,
          tool_calls: m.toolCalls.map(tc => ({
            id: tc.id,
            type: 'function' as const,
            function: { name: tc.name, arguments: JSON.stringify(tc.arguments) },
          })),
        });
      } else {
        openaiMessages.push({ role: m.role as 'user' | 'assistant' | 'system', content: m.content });
      }
    }

    const tools = options?.tools?.map(t => ({
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }));

    const stream = await this.client.chat.completions.create({
      model: this.model,
      messages: openaiMessages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens,
      tools: tools?.length ? tools : undefined,
      stream: true,
    });

    const currentToolCalls: Map<number, { id: string; name: string; arguments: string }> = new Map();

    for await (const chunk of stream) {
      const choice = chunk.choices[0];
      if (!choice) continue;

      const content = choice.delta?.content || '';
      const toolCallDeltas = choice.delta?.tool_calls;

      if (toolCallDeltas) {
        for (const tc of toolCallDeltas) {
          if (!currentToolCalls.has(tc.index)) {
            currentToolCalls.set(tc.index, { id: tc.id || '', name: tc.function?.name || '', arguments: '' });
          }
          const current = currentToolCalls.get(tc.index)!;
          if (tc.id) current.id = tc.id;
          if (tc.function?.name) current.name = tc.function.name;
          if (tc.function?.arguments) current.arguments += tc.function.arguments;
        }
      }

      const done = choice.finish_reason === 'stop' || choice.finish_reason === 'tool_calls';

      if (done && currentToolCalls.size > 0) {
        const toolCalls: ToolCall[] = Array.from(currentToolCalls.values()).map(tc => ({
          id: tc.id,
          name: tc.name,
          arguments: JSON.parse(tc.arguments || '{}'),
        }));
        yield { content, done: true, toolCalls };
      } else {
        yield { content, done };
      }
    }
  }
}
```

### Step 4: Run test to verify it passes

```bash
cd /home/lin/work/myproject/openCLI && npx vitest run tests/providers/openrouter.test.ts 2>&1 | tail -15
```

Expected: 6/6 PASS.

### Step 5: Commit

```bash
cd /home/lin/work/myproject/openCLI && git add src/providers/openrouter.ts tests/providers/openrouter.test.ts && git commit -m "feat(providers): add OpenRouter provider with 15 curated models

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Register providers in index and env

**Files:**
- Modify: `src/providers/index.ts`
- Modify: `src/config/env.ts`

### Step 1: Update `src/providers/index.ts`

Add the two new imports at the top (after existing imports):

```typescript
export { DeepSeekProvider } from './deepseek.js';
export { OpenRouterProvider } from './openrouter.js';
```

Also add the imports in the local import block:

```typescript
import { DeepSeekProvider } from './deepseek.js';
import { OpenRouterProvider } from './openrouter.js';
```

Add two new cases to `createProvider`:

```typescript
    case 'deepseek':
      return new DeepSeekProvider(apiKey);
    case 'openrouter':
      return new OpenRouterProvider(apiKey);
```

### Step 2: Update `src/config/env.ts`

Add the two new env vars to `ENV_VARS`:

```typescript
const ENV_VARS: Record<string, string> = {
  openai: 'OPENAI_API_KEY',
  grok: 'XAI_API_KEY',
  minimax: 'MINIMAX_API_KEY',
  gemini: 'GOOGLE_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY',
  openrouter: 'OPENROUTER_API_KEY',
};
```

### Step 3: Verify build passes

```bash
cd /home/lin/work/myproject/openCLI && npm run build 2>&1 | tail -10
```

Expected: Build succeeds with no errors.

### Step 4: Run full test suite

```bash
cd /home/lin/work/myproject/openCLI && npx vitest run 2>&1 | tail -20
```

Expected: All new tests pass. (The pre-existing `loadCommands` test failure is unrelated to this work.)

### Step 5: Commit

```bash
cd /home/lin/work/myproject/openCLI && git add src/providers/index.ts src/config/env.ts && git commit -m "feat(providers): register DeepSeek and OpenRouter in provider registry

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Update README and docs

**Files:**
- Modify: `README.md`
- Modify: `docs/getting-started.md`
- Modify: `docs/configuration.md`

### Step 1: Update README.md

In the "Multi-Provider Support" bullet, update the list:

```markdown
- **Multi-Provider Support**: OpenAI, Google Gemini, xAI Grok, Minimax, DeepSeek, and OpenRouter (15 curated models)
```

In the Environment Variables table, add two rows:

```markdown
| DeepSeek     | `DEEPSEEK_API_KEY`   |
| OpenRouter   | `OPENROUTER_API_KEY` |
```

In the `--provider` option description, update the list:

```markdown
| `--provider <name>`   | Provider to use (openai, gemini, grok, minimax, deepseek, openrouter) |
```

### Step 2: Update `docs/getting-started.md`

In the "Set up your API key" section, add after the Minimax entry:

```markdown
- **DeepSeek**: https://platform.deepseek.com
- **OpenRouter**: https://openrouter.ai/keys
```

Add the corresponding export lines:

```bash
# DeepSeek
export DEEPSEEK_API_KEY=sk-...

# OpenRouter (access to Claude, Llama, Gemini, Mistral, and more)
export OPENROUTER_API_KEY=sk-or-...
```

### Step 3: Commit

```bash
cd /home/lin/work/myproject/openCLI && git add README.md docs/getting-started.md && git commit -m "docs: add DeepSeek and OpenRouter to provider docs

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```
