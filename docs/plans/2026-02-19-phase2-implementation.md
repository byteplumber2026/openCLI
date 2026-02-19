# Phase 2 Features Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement session checkpointing, MCP server support, and custom commands for enhanced productivity and extensibility.

**Architecture:** Add session persistence layer with atomic writes, MCP client for external tool integration, and TOML-based custom command definitions.

**Tech Stack:** TypeScript, Node.js crypto for hashing, @toml-tools/parser for command definitions

---

## Task 1: Session Store Types

**Files:**

- Create: `src/session/types.ts`
- Create: `tests/session/types.test.ts`

**Step 1: Define session types**

```typescript
// src/session/types.ts
import type { Message } from "../providers/types.js";

export interface Session {
  id: string;
  tag: string;
  messages: Message[];
  provider: string;
  model: string;
  createdAt: string;
  updatedAt: string;
  projectHash: string;
}

export interface SessionMetadata {
  id: string;
  tag: string;
  provider: string;
  model: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}
```

**Step 2: Write test**

```typescript
// tests/session/types.test.ts
import { describe, it, expect } from "vitest";
import type { Session, SessionMetadata } from "../../src/session/types.js";

describe("Session Types", () => {
  it("Session has all required fields", () => {
    const session: Session = {
      id: "test-id",
      tag: "my-session",
      messages: [],
      provider: "openai",
      model: "gpt-4o",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      projectHash: "abc123",
    };
    expect(session.id).toBeDefined();
    expect(session.tag).toBeDefined();
    expect(session.messages).toEqual([]);
  });

  it("SessionMetadata has all required fields", () => {
    const meta: SessionMetadata = {
      id: "test-id",
      tag: "my-session",
      provider: "openai",
      model: "gpt-4o",
      messageCount: 5,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(meta.messageCount).toBe(5);
  });
});
```

**Step 3: Run tests**

Run: `npm run test:run`
Expected: PASS

**Step 4: Commit**

```bash
git add -A
git commit -m "feat(session): add session types"
```

---

## Task 2: Project Hash Utility

**Files:**

- Create: `src/session/hash.ts`
- Create: `tests/session/hash.test.ts`

**Step 1: Implement project hash function**

```typescript
// src/session/hash.ts
import { createHash } from "crypto";

export function getProjectHash(cwd: string): string {
  return createHash("md5").update(cwd).digest("hex").slice(0, 12);
}
```

**Step 2: Write test**

```typescript
// tests/session/hash.test.ts
import { describe, it, expect } from "vitest";
import { getProjectHash } from "../../src/session/hash.js";

describe("getProjectHash", () => {
  it("returns consistent hash for same path", () => {
    const hash1 = getProjectHash("/home/user/myproject");
    const hash2 = getProjectHash("/home/user/myproject");
    expect(hash1).toBe(hash2);
  });

  it("returns different hash for different paths", () => {
    const hash1 = getProjectHash("/home/user/project1");
    const hash2 = getProjectHash("/home/user/project2");
    expect(hash1).not.toBe(hash2);
  });

  it("returns 12 character hash", () => {
    const hash = getProjectHash("/any/path");
    expect(hash.length).toBe(12);
  });
});
```

**Step 3: Run tests**

Run: `npm run test:run`
Expected: PASS

**Step 4: Commit**

```bash
git add -A
git commit -m "feat(session): add project hash utility"
```

---

## Task 3: Session Store Implementation

**Files:**

- Create: `src/session/store.ts`
- Create: `tests/session/store.test.ts`

**Step 1: Implement session store**

```typescript
// src/session/store.ts
import { readFile, writeFile, readdir, mkdir, unlink } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import type { Session, SessionMetadata } from "./types.js";
import { getProjectHash } from "./hash.js";

const SESSIONS_DIR = join(homedir(), ".open-cli", "sessions");

function getSessionDir(projectHash: string): string {
  return join(SESSIONS_DIR, projectHash);
}

function getSessionPath(projectHash: string, tag: string): string {
  return join(getSessionDir(projectHash), `${tag}.json`);
}

export async function ensureSessionsDir(): Promise<void> {
  await mkdir(SESSIONS_DIR, { recursive: true });
}

export async function saveSession(
  tag: string,
  messages: Session["messages"],
  provider: string,
  model: string,
  cwd: string,
): Promise<Session> {
  const projectHash = getProjectHash(cwd);
  const sessionDir = getSessionDir(projectHash);
  await mkdir(sessionDir, { recursive: true });

  const id = `${projectHash}-${tag}`;
  const now = new Date().toISOString();

  const session: Session = {
    id,
    tag,
    messages,
    provider,
    model,
    createdAt: now,
    updatedAt: now,
    projectHash,
  };

  // Atomic write: write to temp file then rename
  const sessionPath = getSessionPath(projectHash, tag);
  const tempPath = `${sessionPath}.tmp`;

  await writeFile(tempPath, JSON.stringify(session, null, 2), "utf-8");
  await rename(tempPath, sessionPath);

  return session;
}

export async function loadSession(
  tag: string,
  cwd: string,
): Promise<Session | null> {
  const projectHash = getProjectHash(cwd);
  const sessionPath = getSessionPath(projectHash, tag);

  if (!existsSync(sessionPath)) {
    return null;
  }

  const content = await readFile(sessionPath, "utf-8");
  return JSON.parse(content) as Session;
}

export async function listSessions(cwd: string): Promise<SessionMetadata[]> {
  const projectHash = getProjectHash(cwd);
  const sessionDir = getSessionDir(projectHash);

  if (!existsSync(sessionDir)) {
    return [];
  }

  const files = await readdir(sessionDir);
  const sessions: SessionMetadata[] = [];

  for (const file of files.filter((f) => f.endsWith(".json"))) {
    try {
      const content = await readFile(join(sessionDir, file), "utf-8");
      const session = JSON.parse(content) as Session;
      sessions.push({
        id: session.id,
        tag: session.tag,
        provider: session.provider,
        model: session.model,
        messageCount: session.messages.length,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      });
    } catch {
      // Skip invalid session files
    }
  }

  return sessions.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export async function deleteSession(
  tag: string,
  cwd: string,
): Promise<boolean> {
  const projectHash = getProjectHash(cwd);
  const sessionPath = getSessionPath(projectHash, tag);

  if (!existsSync(sessionPath)) {
    return false;
  }

  await unlink(sessionPath);
  return true;
}

import { rename } from "fs/promises";
```

**Step 2: Write test**

```typescript
// tests/session/store.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  saveSession,
  loadSession,
  listSessions,
  deleteSession,
  ensureSessionsDir,
} from "../../src/session/store.js";
import { mkdirSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const TEST_DIR = join(tmpdir(), "open-cli-session-test");

describe("Session Store", () => {
  beforeAll(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterAll(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it("saveSession creates session file", async () => {
    const messages = [{ role: "user" as const, content: "Hello" }];
    const session = await saveSession(
      "test",
      messages,
      "openai",
      "gpt-4o",
      TEST_DIR,
    );
    expect(session.tag).toBe("test");
    expect(session.messages).toEqual(messages);
  });

  it("loadSession retrieves saved session", async () => {
    const messages = [{ role: "user" as const, content: "Hello" }];
    await saveSession("load-test", messages, "openai", "gpt-4o", TEST_DIR);

    const loaded = await loadSession("load-test", TEST_DIR);
    expect(loaded).not.toBeNull();
    expect(loaded?.tag).toBe("load-test");
    expect(loaded?.messages).toEqual(messages);
  });

  it("loadSession returns null for non-existent session", async () => {
    const loaded = await loadSession("non-existent", TEST_DIR);
    expect(loaded).toBeNull();
  });

  it("listSessions returns all sessions", async () => {
    await saveSession("list-1", [], "openai", "gpt-4o", TEST_DIR);
    await saveSession("list-2", [], "gemini", "gemini-pro", TEST_DIR);

    const sessions = await listSessions(TEST_DIR);
    expect(sessions.length).toBeGreaterThanOrEqual(2);
    expect(sessions.some((s) => s.tag === "list-1")).toBe(true);
    expect(sessions.some((s) => s.tag === "list-2")).toBe(true);
  });

  it("deleteSession removes session file", async () => {
    await saveSession("delete-me", [], "openai", "gpt-4o", TEST_DIR);

    const deleted = await deleteSession("delete-me", TEST_DIR);
    expect(deleted).toBe(true);

    const loaded = await loadSession("delete-me", TEST_DIR);
    expect(loaded).toBeNull();
  });

  it("deleteSession returns false for non-existent session", async () => {
    const deleted = await deleteSession("non-existent", TEST_DIR);
    expect(deleted).toBe(false);
  });
});
```

**Step 3: Run tests**

Run: `npm run test:run`
Expected: PASS

**Step 4: Commit**

```bash
git add -A
git commit -m "feat(session): add session store with CRUD operations"
```

---

## Task 4: Session Commands

**Files:**

- Modify: `src/cli/commands.ts:1-200`

**Step 1: Add session commands to handler**

```typescript
// Add to imports at top of src/cli/commands.ts
import {
  saveSession,
  loadSession,
  listSessions,
  deleteSession,
} from '../session/store.js';
import type { ChatState } from './commands.js';

// Add to HELP_TEXT:
/chat save <tag>   Save current conversation
/chat list         List saved sessions
/chat resume <tag> Resume a saved session
/chat delete <tag> Delete a saved session
```

Add this case to handleCommand switch statement:

```typescript
case 'chat': {
  const subCommand = command.args.split(' ')[0] || 'list';
  const restArgs = command.args.slice(subCommand.length).trim();

  switch (subCommand) {
    case 'save': {
      if (!restArgs) {
        console.log(chalk.yellow('Usage: /chat save <tag>'));
        return { action: 'continue', state };
      }

      const session = await saveSession(
        restArgs,
        state.messages,
        state.provider.name,
        state.model,
        process.cwd(),
      );
      console.log(chalk.dim(`Session saved: ${session.tag}`));
      return { action: 'continue', state };
    }

    case 'list': {
      const sessions = await listSessions(process.cwd());
      if (sessions.length === 0) {
        console.log(chalk.dim('No saved sessions.'));
      } else {
        console.log(chalk.bold('\nSaved Sessions:'));
        sessions.forEach(s => {
          console.log(`  ${chalk.cyan(s.tag)} - ${s.messageCount} messages, ${s.model}`);
          console.log(`    Updated: ${new Date(s.updatedAt).toLocaleString()}`);
        });
      }
      return { action: 'continue', state };
    }

    case 'resume': {
      if (!restArgs) {
        console.log(chalk.yellow('Usage: /chat resume <tag>'));
        return { action: 'continue', state };
      }

      const session = await loadSession(restArgs, process.cwd());
      if (!session) {
        console.log(chalk.red(`Session not found: ${restArgs}`));
        return { action: 'continue', state };
      }

      console.log(chalk.dim(`Resumed session: ${session.tag} (${session.messages.length} messages)`));
      return {
        action: 'continue',
        state: {
          ...state,
          messages: session.messages,
          model: session.model,
        },
      };
    }

    case 'delete': {
      if (!restArgs) {
        console.log(chalk.yellow('Usage: /chat delete <tag>'));
        return { action: 'continue', state };
      }

      const deleted = await deleteSession(restArgs, process.cwd());
      if (deleted) {
        console.log(chalk.dim(`Session deleted: ${restArgs}`));
      } else {
        console.log(chalk.red(`Session not found: ${restArgs}`));
      }
      return { action: 'continue', state };
    }

    default:
      console.log(chalk.yellow('Usage: /chat [save|list|resume|delete]'));
      return { action: 'continue', state };
  }
}
```

**Step 2: Run tests**

Run: `npm run test:run`
Expected: PASS

**Step 3: Commit**

```bash
git add -A
git commit -m "feat(session): add /chat commands for session management"
```

---

## Task 5: MCP Types Definition

**Files:**

- Create: `src/mcp/types.ts`
- Create: `tests/mcp/types.test.ts`

**Step 1: Define MCP types**

```typescript
// src/mcp/types.ts
export interface MCPServerConfig {
  command?: string;
  args?: string[];
  url?: string;
  httpUrl?: string;
  env?: Record<string, string>;
  timeout?: number;
  trust?: boolean;
}

export interface MCPTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  serverName: string;
}

export interface MCPToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  serverName: string;
}

export interface MCPToolResult {
  id: string;
  result: string;
  isError?: boolean;
}

export type MCPTransportType = "stdio" | "sse" | "http";

export interface MCPTransport {
  type: MCPTransportType;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  send(message: unknown): Promise<void>;
  onMessage(handler: (message: unknown) => void): void;
}
```

**Step 2: Write test**

```typescript
// tests/mcp/types.test.ts
import { describe, it, expect } from "vitest";
import type {
  MCPServerConfig,
  MCPTool,
  MCPToolCall,
} from "../../src/mcp/types.js";

describe("MCP Types", () => {
  it("MCPServerConfig accepts all transport types", () => {
    const stdioConfig: MCPServerConfig = {
      command: "mcp-server",
      args: ["--stdio"],
      env: { KEY: "value" },
    };

    const sseConfig: MCPServerConfig = {
      url: "http://localhost:3000/sse",
    };

    expect(stdioConfig.command).toBe("mcp-server");
    expect(sseConfig.url).toBe("http://localhost:3000/sse");
  });

  it("MCPTool has required fields", () => {
    const tool: MCPTool = {
      name: "read_file",
      description: "Read a file",
      parameters: { type: "object", properties: {} },
      serverName: "filesystem",
    };
    expect(tool.serverName).toBe("filesystem");
  });

  it("MCPToolCall references server", () => {
    const call: MCPToolCall = {
      id: "1",
      name: "read_file",
      arguments: { path: "/tmp/test" },
      serverName: "filesystem",
    };
    expect(call.serverName).toBe("filesystem");
  });
});
```

**Step 3: Run tests**

Run: `npm run test:run`
Expected: PASS

**Step 4: Commit**

```bash
git add -A
git commit -m "feat(mcp): add MCP types and interfaces"
```

---

## Task 6: MCP Settings Integration

**Files:**

- Modify: `src/config/settings.ts:1-54`

**Step 1: Add MCP configuration to settings**

```typescript
// Add to imports
import type { MCPServerConfig } from "../mcp/types.js";

// Update interface
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
  mcpServers: Record<string, MCPServerConfig>;
}

// Update defaults
const defaults: OpenCliConfig = {
  preferences: {
    temperature: 0.7,
  },
  styles: {
    promptColor: "cyan",
    codeTheme: "monokai",
  },
  mcpServers: {},
};

// Add getters/setters at end of file
export function getMCPServers(): Record<string, MCPServerConfig> {
  return config.get("mcpServers") || {};
}

export function setMCPServer(
  name: string,
  serverConfig: MCPServerConfig,
): void {
  const servers = getMCPServers();
  config.set("mcpServers", { ...servers, [name]: serverConfig });
}

export function removeMCPServer(name: string): void {
  const servers = getMCPServers();
  delete servers[name];
  config.set("mcpServers", servers);
}
```

**Step 2: Write test**

```typescript
// tests/config/settings.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import {
  getMCPServers,
  setMCPServer,
  removeMCPServer,
} from "../../src/config/settings.js";

describe("MCP Settings", () => {
  beforeEach(() => {
    // Clean up test servers
    const servers = getMCPServers();
    Object.keys(servers).forEach((key) => removeMCPServer(key));
  });

  it("getMCPServers returns empty object by default", () => {
    const servers = getMCPServers();
    expect(servers).toEqual({});
  });

  it("setMCPServer adds server config", () => {
    setMCPServer("test-server", { command: "test", args: ["--stdio"] });
    const servers = getMCPServers();
    expect(servers["test-server"]).toBeDefined();
    expect(servers["test-server"].command).toBe("test");
  });

  it("removeMCPServer deletes server config", () => {
    setMCPServer("to-remove", { command: "test" });
    removeMCPServer("to-remove");
    const servers = getMCPServers();
    expect(servers["to-remove"]).toBeUndefined();
  });
});
```

**Step 3: Run tests**

Run: `npm run test:run`
Expected: PASS

**Step 4: Commit**

```bash
git add -A
git commit -m "feat(mcp): add MCP server configuration to settings"
```

---

## Task 7: MCP Transport Implementations

**Files:**

- Create: `src/mcp/transport.ts`
- Create: `tests/mcp/transport.test.ts`

**Step 1: Implement stdio transport**

```typescript
// src/mcp/transport.ts
import { spawn, ChildProcess } from "child_process";
import type { MCPTransport, MCPServerConfig } from "./types.js";

export class StdioTransport implements MCPTransport {
  type = "stdio" as const;
  private process: ChildProcess | null = null;
  private messageHandler: ((message: unknown) => void) | null = null;

  constructor(private config: MCPServerConfig) {}

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const { command, args = [], env = {} } = this.config;

      if (!command) {
        reject(new Error("No command specified"));
        return;
      }

      this.process = spawn(command, args, {
        env: { ...process.env, ...env },
        stdio: ["pipe", "pipe", "pipe"],
      });

      let buffer = "";

      this.process.stdout?.on("data", (data: Buffer) => {
        buffer += data.toString();
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.trim() && this.messageHandler) {
            try {
              const message = JSON.parse(line);
              this.messageHandler(message);
            } catch {
              // Ignore invalid JSON
            }
          }
        }
      });

      this.process.on("error", reject);

      // Give it a moment to start
      setTimeout(resolve, 500);
    });
  }

  async disconnect(): Promise<void> {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
  }

  async send(message: unknown): Promise<void> {
    if (!this.process?.stdin) {
      throw new Error("Transport not connected");
    }
    const line = JSON.stringify(message) + "\n";
    this.process.stdin.write(line);
  }

  onMessage(handler: (message: unknown) => void): void {
    this.messageHandler = handler;
  }
}
```

**Step 2: Write test**

```typescript
// tests/mcp/transport.test.ts
import { describe, it, expect } from "vitest";
import { StdioTransport } from "../../src/mcp/transport.js";

describe("StdioTransport", () => {
  it("requires command to connect", async () => {
    const transport = new StdioTransport({});
    await expect(transport.connect()).rejects.toThrow("No command specified");
  });

  it("can send message after connect", async () => {
    // Using echo as a simple test
    const transport = new StdioTransport({ command: "cat" });

    const messages: unknown[] = [];
    transport.onMessage((msg) => messages.push(msg));

    await transport.connect();
    await transport.send({ test: true });
    await transport.disconnect();

    // cat will echo back, but it won't be valid JSON so won't trigger handler
    expect(messages).toEqual([]);
  });
});
```

**Step 3: Run tests**

Run: `npm run test:run`
Expected: PASS

**Step 4: Commit**

```bash
git add -A
git commit -m "feat(mcp): add stdio transport implementation"
```

---

## Task 8: MCP Client

**Files:**

- Create: `src/mcp/client.ts`
- Create: `tests/mcp/client.test.ts`

**Step 1: Implement MCP client**

```typescript
// src/mcp/client.ts
import type { MCPServerConfig, MCPTool, MCPTransport } from "./types.js";
import { StdioTransport } from "./transport.js";

export class MCPClient {
  private transport: MCPTransport | null = null;
  private tools: MCPTool[] = [];
  private requestId = 0;
  private pendingRequests = new Map<number, (response: unknown) => void>();

  constructor(
    private name: string,
    private config: MCPServerConfig,
  ) {}

  async connect(): Promise<void> {
    this.transport = new StdioTransport(this.config);
    this.transport.onMessage((message) => this.handleMessage(message));
    await this.transport.connect();

    // Discover tools after connecting
    await this.discoverTools();
  }

  async disconnect(): Promise<void> {
    await this.transport?.disconnect();
    this.transport = null;
    this.tools = [];
  }

  getTools(): MCPTool[] {
    return this.tools;
  }

  async executeTool(
    name: string,
    args: Record<string, unknown>,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const id = ++this.requestId;

      this.pendingRequests.set(id, (response: any) => {
        if (response.error) {
          reject(new Error(response.error.message || "Tool execution failed"));
        } else {
          resolve(JSON.stringify(response.result || response));
        }
      });

      this.transport?.send({
        jsonrpc: "2.0",
        id,
        method: "tools/call",
        params: { name, arguments: args },
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error("Tool execution timeout"));
        }
      }, 30000);
    });
  }

  private async discoverTools(): Promise<void> {
    return new Promise((resolve, reject) => {
      const id = ++this.requestId;

      this.pendingRequests.set(id, (response: any) => {
        if (response.error) {
          reject(
            new Error(response.error.message || "Failed to discover tools"),
          );
        } else {
          this.tools = (response.result?.tools || []).map((t: any) => ({
            name: `${this.name}_${t.name}`,
            description: t.description,
            parameters: t.parameters,
            serverName: this.name,
          }));
          resolve();
        }
      });

      this.transport?.send({
        jsonrpc: "2.0",
        id,
        method: "tools/list",
      });

      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error("Tool discovery timeout"));
        }
      }, 10000);
    });
  }

  private handleMessage(message: unknown): void {
    const msg = message as any;
    if (msg.id && this.pendingRequests.has(msg.id)) {
      const handler = this.pendingRequests.get(msg.id)!;
      this.pendingRequests.delete(msg.id);
      handler(msg);
    }
  }
}
```

**Step 2: Write test**

```typescript
// tests/mcp/client.test.ts
import { describe, it, expect } from "vitest";
import { MCPClient } from "../../src/mcp/client.js";

describe("MCPClient", () => {
  it("initializes with name and config", () => {
    const client = new MCPClient("test", { command: "echo" });
    expect(client.getTools()).toEqual([]);
  });

  // Note: Full integration tests would require a mock MCP server
  // These are basic unit tests for the client structure
});
```

**Step 3: Run tests**

Run: `npm run test:run`
Expected: PASS

**Step 4: Commit**

```bash
git add -A
git commit -m "feat(mcp): add MCP client for tool discovery and execution"
```

---

## Task 9: MCP Discovery and Registry

**Files:**

- Create: `src/mcp/registry.ts`
- Create: `tests/mcp/registry.test.ts`

**Step 1: Implement MCP registry**

```typescript
// src/mcp/registry.ts
import type { MCPServerConfig, MCPTool } from "./types.js";
import { MCPClient } from "./client.js";

export class MCPRegistry {
  private clients = new Map<string, MCPClient>();
  private allTools: MCPTool[] = [];

  async connectServers(
    configs: Record<string, MCPServerConfig>,
  ): Promise<void> {
    // Disconnect existing clients
    await this.disconnectAll();

    for (const [name, config] of Object.entries(configs)) {
      try {
        const client = new MCPClient(name, config);
        await client.connect();
        this.clients.set(name, client);
      } catch (error) {
        console.warn(`Failed to connect to MCP server ${name}:`, error);
      }
    }

    this.refreshTools();
  }

  async disconnectAll(): Promise<void> {
    for (const client of this.clients.values()) {
      await client.disconnect();
    }
    this.clients.clear();
    this.allTools = [];
  }

  getTools(): MCPTool[] {
    return this.allTools;
  }

  getToolDefinitions() {
    return this.allTools.map((t) => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    }));
  }

  async executeTool(
    name: string,
    args: Record<string, unknown>,
  ): Promise<string> {
    // Find which server owns this tool
    const tool = this.allTools.find((t) => t.name === name);
    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }

    const client = this.clients.get(tool.serverName);
    if (!client) {
      throw new Error(`Server not connected: ${tool.serverName}`);
    }

    return client.executeTool(name.replace(`${tool.serverName}_`, ""), args);
  }

  listServers(): {
    name: string;
    toolCount: number;
    status: "connected" | "error";
  }[] {
    return Array.from(this.clients.entries()).map(([name, client]) => ({
      name,
      toolCount: client.getTools().length,
      status: "connected",
    }));
  }

  private refreshTools(): void {
    this.allTools = [];
    for (const client of this.clients.values()) {
      this.allTools.push(...client.getTools());
    }
  }
}

// Singleton instance
export const mcpRegistry = new MCPRegistry();
```

**Step 2: Write test**

```typescript
// tests/mcp/registry.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { MCPRegistry } from "../../src/mcp/registry.js";

describe("MCPRegistry", () => {
  let registry: MCPRegistry;

  beforeEach(() => {
    registry = new MCPRegistry();
  });

  it("starts with no tools", () => {
    expect(registry.getTools()).toEqual([]);
  });

  it("listServers returns empty array initially", () => {
    expect(registry.listServers()).toEqual([]);
  });

  it("executeTool throws for unknown tool", async () => {
    await expect(registry.executeTool("unknown", {})).rejects.toThrow(
      "Tool not found",
    );
  });
});
```

**Step 3: Run tests**

Run: `npm run test:run`
Expected: PASS

**Step 4: Commit**

```bash
git add -A
git commit -m "feat(mcp): add MCP registry for managing multiple servers"
```

---

## Task 10: MCP Commands

**Files:**

- Modify: `src/cli/commands.ts:1-250`

**Step 1: Add MCP commands**

Add to imports:

```typescript
import { mcpRegistry } from "../mcp/registry.js";
import { getMCPServers } from "../config/settings.js";
```

Add to HELP_TEXT:

```
/mcp              List MCP servers and tools
/mcp refresh      Reconnect to MCP servers
```

Add case to handleCommand:

```typescript
case 'mcp': {
  const subCommand = command.args.split(' ')[0] || 'list';

  switch (subCommand) {
    case 'list':
    case '': {
      const servers = mcpRegistry.listServers();
      if (servers.length === 0) {
        console.log(chalk.dim('No MCP servers connected.'));
        console.log(chalk.dim('Configure servers in settings.json'));
      } else {
        console.log(chalk.bold('\nMCP Servers:'));
        for (const server of servers) {
          console.log(`  ${chalk.cyan(server.name)} - ${server.toolCount} tools`);
        }

        const tools = mcpRegistry.getTools();
        if (tools.length > 0) {
          console.log(chalk.bold('\nAvailable Tools:'));
          for (const tool of tools.slice(0, 20)) {
            console.log(`  ${chalk.dim(tool.name)} - ${tool.description.slice(0, 60)}...`);
          }
          if (tools.length > 20) {
            console.log(chalk.dim(`  ... and ${tools.length - 20} more`));
          }
        }
      }
      return { action: 'continue', state };
    }

    case 'refresh': {
      console.log(chalk.dim('Reconnecting to MCP servers...'));
      const configs = getMCPServers();
      await mcpRegistry.connectServers(configs);
      const servers = mcpRegistry.listServers();
      console.log(chalk.dim(`Connected to ${servers.length} MCP servers`));
      return { action: 'continue', state };
    }

    default:
      console.log(chalk.yellow('Usage: /mcp [list|refresh]'));
      return { action: 'continue', state };
  }
}
```

**Step 2: Run tests**

Run: `npm run test:run`
Expected: PASS

**Step 3: Commit**

```bash
git add -A
git commit -m "feat(mcp): add /mcp commands for server management"
```

---

## Task 11: Custom Command Types

**Files:**

- Create: `src/commands/types.ts`
- Create: `tests/commands/types.test.ts`

**Step 1: Define custom command types**

```typescript
// src/commands/types.ts
export interface CustomCommand {
  name: string;
  description: string;
  prompt: string;
  source: string; // File path where defined
}

export interface CustomCommandDefinition {
  name: string;
  description: string;
  prompt: string;
}
```

**Step 2: Write test**

```typescript
// tests/commands/types.test.ts
import { describe, it, expect } from "vitest";
import type { CustomCommand } from "../../src/commands/types.js";

describe("CustomCommand Types", () => {
  it("CustomCommand has all required fields", () => {
    const cmd: CustomCommand = {
      name: "review",
      description: "Review code",
      prompt: "Review this code: @{{args}}",
      source: "/home/user/.open-cli/commands/review.toml",
    };
    expect(cmd.name).toBe("review");
    expect(cmd.source).toContain("review.toml");
  });
});
```

**Step 3: Run tests**

Run: `npm run test:run`
Expected: PASS

**Step 4: Commit**

```bash
git add -A
git commit -m "feat(commands): add custom command types"
```

---

## Task 12: Custom Command Loader

**Files:**

- Create: `src/commands/loader.ts`
- Create: `tests/commands/loader.test.ts`

**Step 1: Install toml parser dependency**

Run: `npm install @toml-tools/parser`
Expected: Installs successfully

**Step 2: Implement command loader**

```typescript
// src/commands/loader.ts
import { readFile, readdir } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import type { CustomCommand, CustomCommandDefinition } from "./types.js";

const COMMANDS_DIR = join(homedir(), ".open-cli", "commands");

export async function loadCommands(): Promise<Map<string, CustomCommand>> {
  const commands = new Map<string, CustomCommand>();

  if (!existsSync(COMMANDS_DIR)) {
    return commands;
  }

  const files = await readdir(COMMANDS_DIR);

  for (const file of files.filter((f) => f.endsWith(".toml"))) {
    try {
      const content = await readFile(join(COMMANDS_DIR, file), "utf-8");
      const definition = parseToml(content);

      if (isValidDefinition(definition)) {
        commands.set(definition.name, {
          name: definition.name,
          description: definition.description,
          prompt: definition.prompt,
          source: join(COMMANDS_DIR, file),
        });
      }
    } catch (error) {
      console.warn(`Failed to load command from ${file}:`, error);
    }
  }

  return commands;
}

function parseToml(content: string): CustomCommandDefinition {
  // Simple TOML parser for our use case
  const result: Partial<CustomCommandDefinition> = {};
  const lines = content.split("\n");
  let currentKey: string | null = null;
  let currentValue: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("#") || !trimmed) {
      continue; // Skip comments and empty lines
    }

    if (trimmed.startsWith('"""')) {
      // Multi-line string
      if (currentKey) {
        // End of multi-line
        result[currentKey as keyof CustomCommandDefinition] =
          currentValue.join("\n");
        currentKey = null;
        currentValue = [];
      } else {
        // Start of multi-line
        const match = line.match(/^([a-zA-Z_]+)\s*=\s*"""/);
        if (match) {
          currentKey = match[1];
        }
      }
    } else if (currentKey) {
      currentValue.push(line);
    } else {
      // Single-line key-value
      const match = line.match(/^([a-zA-Z_]+)\s*=\s*"([^"]*)"/);
      if (match) {
        result[match[1] as keyof CustomCommandDefinition] = match[2];
      }
    }
  }

  return result as CustomCommandDefinition;
}

function isValidDefinition(
  def: Partial<CustomCommandDefinition>,
): def is CustomCommandDefinition {
  return !!def.name && !!def.description && !!def.prompt;
}
```

**Step 3: Write test**

```typescript
// tests/commands/loader.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { loadCommands } from "../../src/commands/loader.js";
import { mkdirSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const TEST_DIR = join(tmpdir(), "open-cli-commands-test");

describe("Command Loader", () => {
  beforeAll(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterAll(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it("returns empty map when no commands directory", async () => {
    const commands = await loadCommands();
    expect(commands.size).toBe(0);
  });
});
```

**Step 4: Run tests**

Run: `npm run test:run`
Expected: PASS

**Step 5: Commit**

```bash
git add -A
git commit -m "feat(commands): add custom command loader from TOML files"
```

---

## Task 13: Custom Command Executor

**Files:**

- Create: `src/commands/executor.ts`
- Create: `tests/commands/executor.test.ts`

**Step 1: Implement command executor**

```typescript
// src/commands/executor.ts
import type { CustomCommand } from "./types.js";

export async function executeCustomCommand(
  command: CustomCommand,
  args: string,
): Promise<string> {
  // Replace {{args}} placeholder with actual arguments
  return command.prompt.replace(/\{\{args\}\}/g, args);
}

export function formatCustomCommandPrompt(
  command: CustomCommand,
  args: string,
): string {
  return executeCustomCommand(command, args);
}
```

**Step 2: Write test**

```typescript
// tests/commands/executor.test.ts
import { describe, it, expect } from "vitest";
import { executeCustomCommand } from "../../src/commands/executor.js";
import type { CustomCommand } from "../../src/commands/types.js";

describe("Command Executor", () => {
  it("replaces args placeholder", async () => {
    const cmd: CustomCommand = {
      name: "review",
      description: "Review code",
      prompt: "Review this: @{{args}}",
      source: "/test.toml",
    };

    const result = await executeCustomCommand(cmd, "src/index.ts");
    expect(result).toBe("Review this: @src/index.ts");
  });

  it("handles empty args", async () => {
    const cmd: CustomCommand = {
      name: "explain",
      description: "Explain something",
      prompt: "Explain: {{args}}",
      source: "/test.toml",
    };

    const result = await executeCustomCommand(cmd, "");
    expect(result).toBe("Explain: ");
  });

  it("handles multiple placeholders", async () => {
    const cmd: CustomCommand = {
      name: "test",
      description: "Test",
      prompt: "{{args}} and {{args}}",
      source: "/test.toml",
    };

    const result = await executeCustomCommand(cmd, "file.txt");
    expect(result).toBe("file.txt and file.txt");
  });
});
```

**Step 3: Run tests**

Run: `npm run test:run`
Expected: PASS

**Step 4: Commit**

```bash
git add -A
git commit -m "feat(commands): add custom command executor"
```

---

## Task 14: Custom Commands Integration

**Files:**

- Modify: `src/cli/commands.ts:1-300`
- Modify: `src/cli/chat.ts:1-50`

**Step 1: Add custom commands to command handler**

Add to imports in commands.ts:

```typescript
import { loadCommands } from "../commands/loader.js";
import { executeCustomCommand } from "../commands/executor.js";
```

Add to HELP_TEXT:

```
/commands list    List custom commands
/commands reload Reload custom commands
/<custom>        Execute a custom command (e.g., /review)
```

Add case to handleCommand:

```typescript
case 'commands': {
  const subCommand = command.args.split(' ')[0] || 'list';

  switch (subCommand) {
    case 'list':
    case '': {
      const commands = await loadCommands();
      if (commands.size === 0) {
        console.log(chalk.dim('No custom commands found.'));
        console.log(chalk.dim(`Add TOML files to ~/.open-cli/commands/`));
      } else {
        console.log(chalk.bold('\nCustom Commands:'));
        for (const [name, cmd] of commands) {
          console.log(`  /${chalk.cyan(name)} - ${cmd.description}`);
        }
      }
      return { action: 'continue', state };
    }

    case 'reload': {
      console.log(chalk.dim('Custom commands reloaded.'));
      return { action: 'continue', state };
    }

    default:
      console.log(chalk.yellow('Usage: /commands [list|reload]'));
      return { action: 'continue', state };
  }
}
```

Add default case check for custom commands (at end of switch, before default):

```typescript
// Check if it's a custom command
const customCommands = await loadCommands();
if (customCommands.has(command.name)) {
  const customCmd = customCommands.get(command.name)!;
  const prompt = await executeCustomCommand(customCmd, command.args);

  // Add to messages and trigger chat
  state.messages.push({ role: "user", content: prompt });
  // Return special action that chat.ts will handle
  return { action: "custom_command", state };
}
```

**Step 2: Handle custom commands in chat.ts**

Modify chat.ts to handle custom_command action:

```typescript
// In the command handling section (around line 137)
if (isCommand(trimmed)) {
  const command = parseCommand(trimmed);
  const result = await handleCommand(command, state);
  state = result.state;

  if (result.action === "exit") {
    return;
  }

  if (result.action === "custom_command") {
    // Execute the custom command prompt
    await chatWithTools(state);
  }

  continue;
}
```

Also update CommandResult type in commands.ts to include 'custom_command' action.

**Step 3: Run tests**

Run: `npm run test:run`
Expected: PASS

**Step 4: Commit**

```bash
git add -A
git commit -m "feat(commands): integrate custom commands into CLI"
```

---

## Task 15: Session Export Feature

**Files:**

- Create: `src/session/export.ts`
- Create: `tests/session/export.test.ts`

**Step 1: Implement session export**

```typescript
// src/session/export.ts
import type { Session } from "./types.js";

export function exportToMarkdown(session: Session): string {
  const lines: string[] = [
    `# Session: ${session.tag}`,
    "",
    `- Provider: ${session.provider}`,
    `- Model: ${session.model}`,
    `- Created: ${new Date(session.createdAt).toLocaleString()}`,
    "",
    "---",
    "",
  ];

  for (const message of session.messages) {
    switch (message.role) {
      case "user":
        lines.push(`## User`, "", message.content, "");
        break;
      case "assistant":
        lines.push(`## Assistant`, "", message.content, "");
        break;
      case "tool":
        lines.push(`## Tool Result`, "", message.content.slice(0, 200), "");
        break;
    }
    lines.push("");
  }

  return lines.join("\n");
}

export function exportToJSON(session: Session): string {
  return JSON.stringify(
    {
      tag: session.tag,
      provider: session.provider,
      model: session.model,
      createdAt: session.createdAt,
      messages: session.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    },
    null,
    2,
  );
}
```

**Step 2: Write test**

```typescript
// tests/session/export.test.ts
import { describe, it, expect } from "vitest";
import { exportToMarkdown, exportToJSON } from "../../src/session/export.js";
import type { Session } from "../../src/session/types.js";

describe("Session Export", () => {
  const mockSession: Session = {
    id: "test-id",
    tag: "test-session",
    messages: [
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi there!" },
    ],
    provider: "openai",
    model: "gpt-4o",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    projectHash: "abc123",
  };

  it("exports to markdown", () => {
    const markdown = exportToMarkdown(mockSession);
    expect(markdown).toContain("# Session: test-session");
    expect(markdown).toContain("## User");
    expect(markdown).toContain("## Assistant");
    expect(markdown).toContain("Hello");
  });

  it("exports to JSON", () => {
    const json = exportToJSON(mockSession);
    const parsed = JSON.parse(json);
    expect(parsed.tag).toBe("test-session");
    expect(parsed.messages).toHaveLength(2);
  });
});
```

**Step 3: Run tests**

Run: `npm run test:run`
Expected: PASS

**Step 4: Commit**

```bash
git add -A
git commit -m "feat(session): add session export to markdown and JSON"
```

---

## Task 16: Add /chat share Command

**Files:**

- Modify: `src/cli/commands.ts:130-180`

**Step 1: Add share subcommand to /chat**

Add import:

```typescript
import { exportToMarkdown, exportToJSON } from "../session/export.js";
import { writeFile } from "fs/promises";
```

Add to /chat case:

```typescript
case 'share': {
  const restArgs = command.args.slice(subCommand.length).trim();
  const sessions = await listSessions(process.cwd());

  if (sessions.length === 0) {
    console.log(chalk.yellow('No sessions to share'));
    return { action: 'continue', state };
  }

  // Default to most recent session if no tag specified
  const tag = restArgs || sessions[0].tag;
  const session = await loadSession(tag, process.cwd());

  if (!session) {
    console.log(chalk.red(`Session not found: ${tag}`));
    return { action: 'continue', state };
  }

  const filename = `${tag}.md`;
  const markdown = exportToMarkdown(session);
  await writeFile(filename, markdown, 'utf-8');

  console.log(chalk.dim(`Session exported to: ${filename}`));
  return { action: 'continue', state };
}
```

Update help text for /chat:

```
/chat save <tag>   Save current conversation
/chat list         List saved sessions
/chat resume <tag> Resume a saved session
/chat delete <tag> Delete a saved session
/chat share [tag]  Export session to markdown
```

**Step 2: Run tests**

Run: `npm run test:run`
Expected: PASS

**Step 3: Commit**

```bash
git add -A
git commit -m "feat(session): add /chat share command for exporting sessions"
```

---

## Task 17: Additional Utility Commands

**Files:**

- Create: `src/cli/stats.ts`
- Modify: `src/cli/commands.ts:180-250`

**Step 1: Implement stats module**

```typescript
// src/cli/stats.ts
import type { Message } from "../providers/types.js";

export interface SessionStats {
  messageCount: number;
  userMessages: number;
  assistantMessages: number;
  toolCalls: number;
  estimatedTokens: number;
}

export function calculateStats(messages: Message[]): SessionStats {
  let userMessages = 0;
  let assistantMessages = 0;
  let toolCalls = 0;
  let totalContent = "";

  for (const msg of messages) {
    if (msg.role === "user") {
      userMessages++;
      totalContent += msg.content;
    } else if (msg.role === "assistant") {
      assistantMessages++;
      totalContent += msg.content;
      if (msg.toolCalls) {
        toolCalls += msg.toolCalls.length;
      }
    }
  }

  // Rough estimation: ~4 characters per token
  const estimatedTokens = Math.ceil(totalContent.length / 4);

  return {
    messageCount: messages.length,
    userMessages,
    assistantMessages,
    toolCalls,
    estimatedTokens,
  };
}

export function formatStats(stats: SessionStats): string {
  return [
    `Messages: ${stats.messageCount} (${stats.userMessages} user, ${stats.assistantMessages} assistant)`,
    `Tool calls: ${stats.toolCalls}`,
    `Estimated tokens: ${stats.estimatedTokens.toLocaleString()}`,
  ].join("\n");
}
```

**Step 2: Add /stats command**

Add import to commands.ts:

```typescript
import { calculateStats, formatStats } from "./stats.js";
```

Add to HELP_TEXT:

```
/stats          Show session statistics
```

Add case to handleCommand:

```typescript
case 'stats': {
  const stats = calculateStats(state.messages);
  console.log(chalk.bold('\nSession Statistics:'));
  console.log(formatStats(stats));
  return { action: 'continue', state };
}
```

**Step 3: Write test**

```typescript
// tests/cli/stats.test.ts
import { describe, it, expect } from "vitest";
import { calculateStats } from "../../src/cli/stats.js";
import type { Message } from "../../src/providers/types.js";

describe("Stats", () => {
  it("calculates stats correctly", () => {
    const messages: Message[] = [
      { role: "user", content: "Hello" },
      {
        role: "assistant",
        content: "Hi!",
        toolCalls: [{ id: "1", name: "test", arguments: {} }],
      },
      { role: "tool", content: "result" },
    ];

    const stats = calculateStats(messages);
    expect(stats.messageCount).toBe(3);
    expect(stats.userMessages).toBe(1);
    expect(stats.assistantMessages).toBe(1);
    expect(stats.toolCalls).toBe(1);
    expect(stats.estimatedTokens).toBeGreaterThan(0);
  });

  it("handles empty messages", () => {
    const stats = calculateStats([]);
    expect(stats.messageCount).toBe(0);
    expect(stats.estimatedTokens).toBe(0);
  });
});
```

**Step 4: Run tests**

Run: `npm run test:run`
Expected: PASS

**Step 5: Commit**

```bash
git add -A
git commit -m "feat(cli): add /stats command for session statistics"
```

---

## Task 18: Copy to Clipboard Command

**Files:**

- Modify: `src/cli/commands.ts:180-300`
- Modify: `package.json`

**Step 1: Add clipboardy dependency**

Run: `npm install clipboardy`
Expected: Installs successfully

**Step 2: Add /copy command**

Add import:

```typescript
import clipboardy from "clipboardy";
```

Add to HELP_TEXT:

```
/copy           Copy last assistant response to clipboard
```

Add case to handleCommand:

```typescript
case 'copy': {
  // Find last assistant message
  const lastAssistant = state.messages
    .slice()
    .reverse()
    .find(m => m.role === 'assistant');

  if (!lastAssistant) {
    console.log(chalk.yellow('No assistant response to copy'));
    return { action: 'continue', state };
  }

  try {
    await clipboardy.write(lastAssistant.content);
    console.log(chalk.dim('Last response copied to clipboard'));
  } catch (error) {
    console.log(chalk.red('Failed to copy to clipboard'));
  }

  return { action: 'continue', state };
}
```

**Step 3: Run tests**

Run: `npm run test:run`
Expected: PASS

**Step 4: Commit**

```bash
git add -A
git commit -m "feat(cli): add /copy command for clipboard integration"
```

---

## Task 19: Integration Test

**Files:**

- Create: `tests/integration/phase2.test.ts`

**Step 1: Write integration test**

```typescript
// tests/integration/phase2.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  saveSession,
  loadSession,
  deleteSession,
} from "../../src/session/store.js";
import { calculateStats } from "../../src/cli/stats.js";
import { executeCustomCommand } from "../../src/commands/executor.js";
import type { CustomCommand } from "../../src/commands/types.js";
import { mkdirSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const TEST_DIR = join(tmpdir(), "open-cli-phase2-test");

describe("Phase 2 Integration", () => {
  beforeAll(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterAll(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it("save and load session round-trip", async () => {
    const messages = [
      { role: "user" as const, content: "Hello" },
      { role: "assistant" as const, content: "Hi there!" },
    ];

    await saveSession(
      "integration-test",
      messages,
      "openai",
      "gpt-4o",
      TEST_DIR,
    );
    const loaded = await loadSession("integration-test", TEST_DIR);

    expect(loaded).not.toBeNull();
    expect(loaded?.messages).toHaveLength(2);
    expect(loaded?.provider).toBe("openai");

    await deleteSession("integration-test", TEST_DIR);
  });

  it("stats calculation works with session data", () => {
    const messages = [
      { role: "user" as const, content: "Hello world" },
      { role: "assistant" as const, content: "How can I help you today?" },
      { role: "user" as const, content: "Tell me a joke" },
      { role: "assistant" as const, content: "Why did the..." },
    ];

    const stats = calculateStats(messages);
    expect(stats.messageCount).toBe(4);
    expect(stats.userMessages).toBe(2);
    expect(stats.assistantMessages).toBe(2);
  });

  it("custom command execution replaces args", async () => {
    const cmd: CustomCommand = {
      name: "review",
      description: "Review code",
      prompt: "Please review this file: @{{args}}",
      source: "/test.toml",
    };

    const result = await executeCustomCommand(cmd, "src/main.ts");
    expect(result).toBe("Please review this file: @src/main.ts");
  });
});
```

**Step 2: Run tests**

Run: `npm run test:run`
Expected: PASS

**Step 3: Commit**

```bash
git add -A
git commit -m "test: add Phase 2 integration tests"
```

---

## Task 20: Update Help Text

**Files:**

- Modify: `src/cli/commands.ts:42-64`

**Step 1: Update comprehensive help text**

```typescript
const HELP_TEXT = `
${chalk.bold("Available Commands:")}

Session Management:
  /chat save <tag>   Save current conversation
  /chat list         List saved sessions
  /chat resume <tag> Resume a saved session
  /chat delete <tag> Delete a saved session
  /chat share [tag]  Export session to markdown

AI Configuration:
  /models            Switch to a different model
  /provider          Switch to a different provider

Context & Memory:
  /memory            Manage context memory (show, add, list, refresh)
  /file <path>       Add file to context
  @filename          Reference files inline

Extensions:
  /mcp               List MCP servers and tools
  /mcp refresh       Reconnect to MCP servers
  /commands          List custom commands
  /commands reload   Reload custom commands

Utilities:
  /stats             Show session statistics
  /copy              Copy last response to clipboard
  /styles            Change terminal color theme
  /clear             Clear conversation history
  /help              Show this help message
  /exit              Exit open-cli

File Context:
  Use @filename or @directory/ to include files:
  ${chalk.dim("What does @src/index.ts do?")}
  ${chalk.dim("Review @src/")}

Shell Passthrough:
  Use !command to execute shell commands:
  ${chalk.dim("!ls -la")}
  ${chalk.dim("!         (toggle shell mode)")}

Custom Commands:
  Define in ~/.open-cli/commands/*.toml
  Then use /{name} to execute
`;
```

**Step 2: Run tests**

Run: `npm run test:run`
Expected: PASS

**Step 3: Commit**

```bash
git add -A
git commit -m "docs: update help text with all Phase 2 commands"
```

---

## Summary

**Completed Features:**

1. Session checkpointing (save, load, list, delete, share)
2. MCP server support (types, transport, client, registry, commands)
3. Custom commands (TOML-based, dynamic loading)
4. Additional commands (/stats, /copy, updated help)

**New Files Created:**

- `src/session/types.ts` - Session type definitions
- `src/session/hash.ts` - Project hash utility
- `src/session/store.ts` - Session persistence
- `src/session/export.ts` - Export to markdown/JSON
- `src/mcp/types.ts` - MCP type definitions
- `src/mcp/transport.ts` - Stdio transport
- `src/mcp/client.ts` - MCP client
- `src/mcp/registry.ts` - Server registry
- `src/commands/types.ts` - Custom command types
- `src/commands/loader.ts` - TOML command loader
- `src/commands/executor.ts` - Command executor
- `src/cli/stats.ts` - Statistics calculation
- Various test files

**Modified Files:**

- `src/config/settings.ts` - MCP server configuration
- `src/cli/commands.ts` - New slash commands
- `src/cli/chat.ts` - Custom command handling

**Dependencies Added:**

- @toml-tools/parser (for custom commands)
- clipboardy (for copy command)

**To Test Manually:**

```bash
# Build
npm run build

# Test session commands
/chat save my-session
/chat list
/chat share my-session
/chat resume my-session
/chat delete my-session

# Test stats
/stats

# Test copy
/copy

# Create custom command
echo 'name = "review"
description = "Review code for issues"
prompt = """Review this code:
@{{args}}

Focus on bugs, security, and performance."""' > ~/.open-cli/commands/review.toml

/commands reload
/review src/index.ts
```
