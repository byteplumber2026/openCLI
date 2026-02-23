# Tools Feature Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add shell and file operation tools to open_cli, enabling the LLM to execute commands and manipulate files.

**Architecture:** Create tools module with 5 tools (shell_run, file_read, file_write, file_list, file_search). Update providers to support function calling. Add tool execution loop to chat with smart confirmation.

**Tech Stack:** TypeScript, Node.js child_process, fs/promises, fast-glob

---

## Task 1: Tool Types & Definitions

**Files:**
- Create: `src/tools/types.ts`
- Create: `src/tools/definitions.ts`
- Create: `tests/tools/types.test.ts`

**Step 1: Create tool type definitions**

```typescript
// src/tools/types.ts
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
    }>;
    required: string[];
  };
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  id: string;
  result: string;
  isError?: boolean;
}
```

**Step 2: Create tool definitions**

```typescript
// src/tools/definitions.ts
import type { ToolDefinition } from './types.js';

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'shell_run',
    description: 'Execute a shell command and return the output',
    parameters: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'The shell command to execute' },
        workdir: { type: 'string', description: 'Working directory (optional)' },
      },
      required: ['command'],
    },
  },
  {
    name: 'file_read',
    description: 'Read the contents of a file',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to the file to read' },
      },
      required: ['path'],
    },
  },
  {
    name: 'file_write',
    description: 'Write content to a file (creates or overwrites)',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to the file to write' },
        content: { type: 'string', description: 'Content to write to the file' },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'file_list',
    description: 'List files and directories in a path',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Directory path to list' },
        recursive: { type: 'boolean', description: 'Include subdirectories' },
      },
      required: ['path'],
    },
  },
  {
    name: 'file_search',
    description: 'Search for a text pattern in files',
    parameters: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'Regex pattern to search for' },
        path: { type: 'string', description: 'Directory to search in' },
        glob: { type: 'string', description: 'File pattern (e.g., "*.ts")' },
      },
      required: ['pattern'],
    },
  },
];
```

**Step 3: Write test**

```typescript
// tests/tools/types.test.ts
import { describe, it, expect } from 'vitest';
import { TOOL_DEFINITIONS } from '../../src/tools/definitions.js';
import type { ToolCall, ToolResult } from '../../src/tools/types.js';

describe('Tool Types', () => {
  it('has 5 tool definitions', () => {
    expect(TOOL_DEFINITIONS).toHaveLength(5);
  });

  it('all tools have required fields', () => {
    for (const tool of TOOL_DEFINITIONS) {
      expect(tool.name).toBeDefined();
      expect(tool.description).toBeDefined();
      expect(tool.parameters).toBeDefined();
    }
  });

  it('ToolCall type works correctly', () => {
    const call: ToolCall = { id: '1', name: 'file_read', arguments: { path: 'test.txt' } };
    expect(call.name).toBe('file_read');
  });
});
```

**Step 4: Run tests**

Run: `npm run test:run`
Expected: PASS

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add tool types and definitions"
```

---

## Task 2: Shell Tool Implementation

**Files:**
- Create: `src/tools/shell.ts`
- Create: `tests/tools/shell.test.ts`

**Step 1: Implement shell_run**

```typescript
// src/tools/shell.ts
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const TIMEOUT = 30000; // 30 seconds

export interface ShellRunArgs {
  command: string;
  workdir?: string;
}

export async function shellRun(args: ShellRunArgs): Promise<string> {
  const { command, workdir } = args;

  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: workdir || process.cwd(),
      timeout: TIMEOUT,
      maxBuffer: 1024 * 1024, // 1MB
    });

    const output = stdout || stderr;
    return output.trim() || '(no output)';
  } catch (error: any) {
    if (error.killed) {
      throw new Error(`Command timed out after ${TIMEOUT / 1000}s`);
    }
    if (error.stderr) {
      throw new Error(error.stderr.trim());
    }
    throw new Error(error.message);
  }
}
```

**Step 2: Write test**

```typescript
// tests/tools/shell.test.ts
import { describe, it, expect } from 'vitest';
import { shellRun } from '../../src/tools/shell.js';

describe('shellRun', () => {
  it('executes simple command', async () => {
    const result = await shellRun({ command: 'echo hello' });
    expect(result).toBe('hello');
  });

  it('returns pwd output', async () => {
    const result = await shellRun({ command: 'pwd' });
    expect(result).toContain('/');
  });

  it('handles command with workdir', async () => {
    const result = await shellRun({ command: 'pwd', workdir: '/tmp' });
    expect(result).toBe('/tmp');
  });

  it('throws on invalid command', async () => {
    await expect(shellRun({ command: 'nonexistent_command_xyz' })).rejects.toThrow();
  });
});
```

**Step 3: Run tests**

Run: `npm run test:run`
Expected: PASS

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add shell_run tool"
```

---

## Task 3: File Tools Implementation

**Files:**
- Create: `src/tools/files.ts`
- Create: `tests/tools/files.test.ts`

**Step 1: Implement file tools**

```typescript
// src/tools/files.ts
import { readFile, writeFile, readdir, stat } from 'fs/promises';
import { join, resolve } from 'path';
import fg from 'fast-glob';

export interface FileReadArgs {
  path: string;
}

export interface FileWriteArgs {
  path: string;
  content: string;
}

export interface FileListArgs {
  path: string;
  recursive?: boolean;
}

export interface FileSearchArgs {
  pattern: string;
  path?: string;
  glob?: string;
}

export async function fileRead(args: FileReadArgs): Promise<string> {
  const content = await readFile(resolve(args.path), 'utf-8');
  return content;
}

export async function fileWrite(args: FileWriteArgs): Promise<string> {
  await writeFile(resolve(args.path), args.content, 'utf-8');
  return `Wrote ${args.content.length} bytes to ${args.path}`;
}

export async function fileList(args: FileListArgs): Promise<string> {
  const dirPath = resolve(args.path);

  if (args.recursive) {
    const files = await fg('**/*', { cwd: dirPath, onlyFiles: false, markDirectories: true });
    return files.join('\n') || '(empty directory)';
  }

  const entries = await readdir(dirPath, { withFileTypes: true });
  const lines = entries.map(e => e.isDirectory() ? `${e.name}/` : e.name);
  return lines.join('\n') || '(empty directory)';
}

export async function fileSearch(args: FileSearchArgs): Promise<string> {
  const searchPath = resolve(args.path || '.');
  const globPattern = args.glob || '**/*';
  const regex = new RegExp(args.pattern);

  const files = await fg(globPattern, { cwd: searchPath, onlyFiles: true });
  const results: string[] = [];

  for (const file of files.slice(0, 100)) { // Limit to 100 files
    try {
      const content = await readFile(join(searchPath, file), 'utf-8');
      const lines = content.split('\n');
      lines.forEach((line, i) => {
        if (regex.test(line)) {
          results.push(`${file}:${i + 1}: ${line.trim()}`);
        }
      });
    } catch {
      // Skip unreadable files
    }
  }

  return results.slice(0, 50).join('\n') || 'No matches found';
}
```

**Step 2: Write test**

```typescript
// tests/tools/files.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { fileRead, fileWrite, fileList, fileSearch } from '../../src/tools/files.js';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';

const TEST_DIR = '/tmp/opencli-tools-test';

describe('File Tools', () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
    writeFileSync(join(TEST_DIR, 'test.txt'), 'hello world');
    writeFileSync(join(TEST_DIR, 'code.ts'), 'const x = 1;\nconst y = 2;');
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('fileRead reads file content', async () => {
    const result = await fileRead({ path: join(TEST_DIR, 'test.txt') });
    expect(result).toBe('hello world');
  });

  it('fileWrite creates file', async () => {
    const result = await fileWrite({ path: join(TEST_DIR, 'new.txt'), content: 'new content' });
    expect(result).toContain('Wrote');
    const content = await fileRead({ path: join(TEST_DIR, 'new.txt') });
    expect(content).toBe('new content');
  });

  it('fileList lists directory', async () => {
    const result = await fileList({ path: TEST_DIR });
    expect(result).toContain('test.txt');
    expect(result).toContain('code.ts');
  });

  it('fileSearch finds matches', async () => {
    const result = await fileSearch({ pattern: 'const', path: TEST_DIR });
    expect(result).toContain('code.ts');
    expect(result).toContain('const');
  });
});
```

**Step 3: Run tests**

Run: `npm run test:run`
Expected: PASS

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add file tools (read, write, list, search)"
```

---

## Task 4: Tool Executor with Confirmation

**Files:**
- Create: `src/tools/executor.ts`
- Create: `tests/tools/executor.test.ts`

**Step 1: Implement executor**

```typescript
// src/tools/executor.ts
import { confirm } from '@inquirer/prompts';
import chalk from 'chalk';
import type { ToolCall, ToolResult } from './types.js';
import { shellRun } from './shell.js';
import { fileRead, fileWrite, fileList, fileSearch } from './files.js';

const SAFE_TOOLS = ['file_read', 'file_list', 'file_search'];
const SAFE_COMMANDS = [
  /^ls\b/, /^cat\b/, /^pwd$/, /^echo\b/, /^head\b/,
  /^tail\b/, /^grep\b/, /^find\b/, /^which\b/, /^wc\b/,
];

export function needsConfirmation(toolName: string, args: Record<string, unknown>): boolean {
  if (SAFE_TOOLS.includes(toolName)) return false;
  if (toolName === 'shell_run') {
    const cmd = args.command as string;
    if (SAFE_COMMANDS.some(r => r.test(cmd))) return false;
  }
  return true;
}

export async function executeTool(call: ToolCall, skipConfirm = false): Promise<ToolResult> {
  const { id, name, arguments: args } = call;

  // Show what we're about to do
  console.log(chalk.dim(`\n[${name}]`), formatArgs(name, args));

  // Check if confirmation needed
  if (!skipConfirm && needsConfirmation(name, args)) {
    const allowed = await confirm({
      message: `Allow ${name}?`,
      default: true,
    });
    if (!allowed) {
      return { id, result: 'User declined to execute this operation', isError: true };
    }
  }

  try {
    const result = await runTool(name, args);
    console.log(chalk.green('[Done]'), result.slice(0, 100) + (result.length > 100 ? '...' : ''));
    return { id, result };
  } catch (error: any) {
    const errMsg = error.message || 'Unknown error';
    console.log(chalk.red('[Error]'), errMsg);
    return { id, result: `Error: ${errMsg}`, isError: true };
  }
}

async function runTool(name: string, args: Record<string, unknown>): Promise<string> {
  switch (name) {
    case 'shell_run':
      return shellRun(args as any);
    case 'file_read':
      return fileRead(args as any);
    case 'file_write':
      return fileWrite(args as any);
    case 'file_list':
      return fileList(args as any);
    case 'file_search':
      return fileSearch(args as any);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

function formatArgs(name: string, args: Record<string, unknown>): string {
  if (name === 'shell_run') return args.command as string;
  if (name === 'file_read' || name === 'file_list') return args.path as string;
  if (name === 'file_write') return `${args.path} (${(args.content as string).length} bytes)`;
  if (name === 'file_search') return `"${args.pattern}" in ${args.path || '.'}`;
  return JSON.stringify(args);
}
```

**Step 2: Write test**

```typescript
// tests/tools/executor.test.ts
import { describe, it, expect } from 'vitest';
import { needsConfirmation } from '../../src/tools/executor.js';

describe('Executor', () => {
  it('file_read does not need confirmation', () => {
    expect(needsConfirmation('file_read', { path: 'test.txt' })).toBe(false);
  });

  it('file_list does not need confirmation', () => {
    expect(needsConfirmation('file_list', { path: '.' })).toBe(false);
  });

  it('file_write needs confirmation', () => {
    expect(needsConfirmation('file_write', { path: 'x', content: 'y' })).toBe(true);
  });

  it('shell_run ls does not need confirmation', () => {
    expect(needsConfirmation('shell_run', { command: 'ls -la' })).toBe(false);
  });

  it('shell_run rm needs confirmation', () => {
    expect(needsConfirmation('shell_run', { command: 'rm file.txt' })).toBe(true);
  });

  it('shell_run npm install needs confirmation', () => {
    expect(needsConfirmation('shell_run', { command: 'npm install' })).toBe(true);
  });
});
```

**Step 3: Run tests**

Run: `npm run test:run`
Expected: PASS

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add tool executor with confirmation logic"
```

---

## Task 5: System Prompt & Tools Index

**Files:**
- Create: `src/tools/systemPrompt.ts`
- Create: `src/tools/index.ts`

**Step 1: Create system prompt**

```typescript
// src/tools/systemPrompt.ts
export function getSystemPrompt(): string {
  return `You are a helpful coding assistant with access to tools for file and shell operations.

## Available Tools
- shell_run: Execute shell commands
- file_read: Read file contents
- file_write: Write/create files
- file_list: List directory contents
- file_search: Search for text in files

## Guidelines
1. **Read before modifying** - Always read a file before editing it
2. **Explain your actions** - Tell the user what you're about to do
3. **Use appropriate tools** - Prefer file_read over cat, file_list over ls for structured output
4. **Be cautious** - For destructive operations, explain the impact first
5. **Handle errors gracefully** - If a command fails, explain why and suggest fixes

## Working Directory
Current directory: ${process.cwd()}

When the user asks you to perform tasks, use the available tools. For reading files, modifying code, running tests, or executing commands - use the tools rather than just describing what to do.`;
}
```

**Step 2: Create index exports**

```typescript
// src/tools/index.ts
export * from './types.js';
export * from './definitions.js';
export * from './executor.js';
export * from './systemPrompt.js';
```

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add system prompt and tools index"
```

---

## Task 6: Update Provider Types

**Files:**
- Modify: `src/providers/types.ts`
- Modify: `tests/providers/types.test.ts`

**Step 1: Update types.ts**

```typescript
// src/providers/types.ts
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, { type: string; description: string }>;
    required: string[];
  };
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  tools?: ToolDefinition[];
}

export interface StreamChunk {
  content: string;
  done: boolean;
  toolCalls?: ToolCall[];
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

**Step 2: Run tests**

Run: `npm run test:run`
Expected: PASS

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: update provider types for tool calling"
```

---

## Task 7: Update OpenAI Provider for Tool Calling

**Files:**
- Modify: `src/providers/openai.ts`

**Step 1: Update OpenAI provider**

```typescript
// src/providers/openai.ts
import OpenAI from 'openai';
import type { Provider, Message, ChatOptions, StreamChunk, Model, ToolCall } from './types.js';

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
  private model: string = 'gpt-4o';

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
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

    let currentToolCalls: Map<number, { id: string; name: string; arguments: string }> = new Map();

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

**Step 2: Run tests**

Run: `npm run test:run`
Expected: PASS

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: update OpenAI provider for tool calling"
```

---

## Task 8: Update Gemini Provider for Tool Calling

**Files:**
- Modify: `src/providers/gemini.ts`

**Step 1: Update Gemini provider** (same pattern as OpenAI since it uses OpenAI-compatible API)

```typescript
// src/providers/gemini.ts
import OpenAI from 'openai';
import type { Provider, Message, ChatOptions, StreamChunk, Model, ToolCall } from './types.js';

const MODELS: Model[] = [
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', contextWindow: 1048576 },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', contextWindow: 2097152 },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', contextWindow: 1048576 },
];

export class GeminiProvider implements Provider {
  readonly name = 'gemini';
  readonly envVar = 'GOOGLE_API_KEY';
  private client: OpenAI;
  private model: string = 'gemini-2.0-flash';

  constructor(apiKey: string) {
    this.client = new OpenAI({
      apiKey,
      baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
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

    let currentToolCalls: Map<number, { id: string; name: string; arguments: string }> = new Map();

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

**Step 2: Run tests**

Run: `npm run test:run`
Expected: PASS

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: update Gemini provider for tool calling"
```

---

## Task 9: Update Grok Provider for Tool Calling

**Files:**
- Modify: `src/providers/grok.ts`

**Step 1: Update Grok provider** (same pattern, different baseURL)

Follow exact same pattern as OpenAI/Gemini providers, just with baseURL 'https://api.x.ai/v1' and model 'grok-2'.

**Step 2: Run tests**

Run: `npm run test:run`
Expected: PASS

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: update Grok provider for tool calling"
```

---

## Task 10: Update Chat Loop for Tool Execution

**Files:**
- Modify: `src/cli/chat.ts`

**Step 1: Update chat.ts with tool execution loop**

```typescript
// src/cli/chat.ts
import * as readline from 'readline';
import chalk from 'chalk';
import type { Provider, Message } from '../providers/types.js';
import { formatPrompt, streamWrite } from './renderer.js';
import { isCommand, parseCommand, handleCommand, type ChatState } from './commands.js';
import { buildFileContext } from '../context/files.js';
import { TOOL_DEFINITIONS, executeTool, getSystemPrompt } from '../tools/index.js';

export async function startChat(provider: Provider, model: string): Promise<void> {
  let state: ChatState = {
    provider,
    model,
    messages: [],
  };

  // Set model on provider if supported
  if ('setModel' in provider) {
    (provider as any).setModel(model);
  }

  console.log(chalk.dim('\nType /help for commands, /exit to quit.\n'));

  const createReadline = () => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.on('SIGINT', () => {
      console.log(chalk.dim('\nGoodbye!'));
      rl.close();
      process.exit(0);
    });

    return rl;
  };

  const runLoop = async (): Promise<void> => {
    while (true) {
      const rl = createReadline();

      const input = await new Promise<string>((resolve) => {
        rl.question(formatPrompt(state.provider.name, state.model), (answer) => {
          rl.close();
          resolve(answer);
        });
      });

      const trimmed = input.trim();

      if (!trimmed) {
        continue;
      }

      if (isCommand(trimmed)) {
        const command = parseCommand(trimmed);
        const result = await handleCommand(command, state);
        state = result.state;

        if (result.action === 'exit') {
          return;
        }

        continue;
      }

      // Build file context
      const { context, cleanInput } = await buildFileContext(trimmed);
      const userContent = context ? `${context}\n\n${cleanInput}` : cleanInput;

      state.messages.push({ role: 'user', content: userContent });

      // Chat with tool loop
      await chatWithTools(state);
    }
  };

  await runLoop();
}

async function chatWithTools(state: ChatState): Promise<void> {
  const maxIterations = 10; // Prevent infinite loops
  let iterations = 0;

  while (iterations < maxIterations) {
    iterations++;
    console.log();

    let fullResponse = '';
    let toolCalls: any[] | undefined;

    try {
      for await (const chunk of state.provider.chat(state.messages, {
        temperature: 0.7,
        systemPrompt: getSystemPrompt(),
        tools: TOOL_DEFINITIONS,
      })) {
        streamWrite(chunk.content);
        fullResponse += chunk.content;
        if (chunk.toolCalls) {
          toolCalls = chunk.toolCalls;
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.log(chalk.red(`\nError: ${errorMsg}`));
      state.messages.pop();
      return;
    }

    // If no tool calls, we're done
    if (!toolCalls || toolCalls.length === 0) {
      console.log('\n');
      state.messages.push({ role: 'assistant', content: fullResponse });
      return;
    }

    // Add assistant message with tool calls
    state.messages.push({ role: 'assistant', content: fullResponse, toolCalls });

    // Execute each tool call
    for (const call of toolCalls) {
      const result = await executeTool(call);
      state.messages.push({
        role: 'tool',
        content: result.result,
        toolCallId: call.id,
      });
    }

    // Loop continues - LLM will process tool results
  }

  console.log(chalk.yellow('\nMax tool iterations reached'));
}
```

**Step 2: Run tests**

Run: `npm run test:run`
Expected: PASS

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add tool execution loop to chat"
```

---

## Task 11: Integration Test

**Files:**
- Create: `tests/integration/tools.test.ts`

**Step 1: Write integration test**

```typescript
// tests/integration/tools.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { shellRun } from '../../src/tools/shell.js';
import { fileRead, fileWrite, fileList } from '../../src/tools/files.js';
import { needsConfirmation, executeTool } from '../../src/tools/executor.js';
import { TOOL_DEFINITIONS } from '../../src/tools/definitions.js';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';

const TEST_DIR = '/tmp/opencli-integration-test';

describe('Tools Integration', () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
    writeFileSync(join(TEST_DIR, 'test.txt'), 'test content');
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('shell + file tools work together', async () => {
    // List files
    const listResult = await fileList({ path: TEST_DIR });
    expect(listResult).toContain('test.txt');

    // Read file
    const readResult = await fileRead({ path: join(TEST_DIR, 'test.txt') });
    expect(readResult).toBe('test content');

    // Shell command
    const shellResult = await shellRun({ command: `ls ${TEST_DIR}` });
    expect(shellResult).toContain('test.txt');
  });

  it('confirmation logic works correctly', () => {
    expect(needsConfirmation('file_read', {})).toBe(false);
    expect(needsConfirmation('file_write', {})).toBe(true);
    expect(needsConfirmation('shell_run', { command: 'ls' })).toBe(false);
    expect(needsConfirmation('shell_run', { command: 'rm -rf /' })).toBe(true);
  });

  it('all tool definitions are valid', () => {
    expect(TOOL_DEFINITIONS.length).toBe(5);
    for (const tool of TOOL_DEFINITIONS) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.parameters.type).toBe('object');
    }
  });
});
```

**Step 2: Run tests**

Run: `npm run test:run`
Expected: PASS

**Step 3: Commit**

```bash
git add -A
git commit -m "test: add tools integration test"
```

---

## Summary

**Tasks:**
1. Tool types & definitions
2. Shell tool implementation
3. File tools implementation
4. Tool executor with confirmation
5. System prompt & tools index
6. Update provider types
7. Update OpenAI provider
8. Update Gemini provider
9. Update Grok provider
10. Update chat loop
11. Integration test

**To test manually:**
```bash
npm run dev
> list files in the current directory
> read package.json
> create a file called test.txt with "hello world"
```
