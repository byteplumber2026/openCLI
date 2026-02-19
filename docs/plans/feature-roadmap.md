# Open-CLI Feature Roadmap

> Goal: Implement key features from Gemini-CLI to make Open-CLI a production-ready multi-provider AI terminal assistant.

## Executive Summary

This roadmap outlines the implementation of Gemini-CLI features in Open-CLI, prioritized by impact and effort. The current Open-CLI has solid foundations (multi-provider support, basic tools, file context) but lacks several key UX and extensibility features.

**Total estimated effort:** 15-20 days for Phase 1-2

---

## Current State Analysis

### What Open-CLI Has ✅

| Feature                | Status      | Notes                                                    |
| ---------------------- | ----------- | -------------------------------------------------------- |
| Multi-provider support | ✅ Complete | OpenAI, Gemini, Grok, Minimax                            |
| Basic tools            | ✅ Complete | shell*run, file*\*, web_search, http_request             |
| @ file inclusion       | ✅ Basic    | Single files only                                        |
| Slash commands         | ✅ Basic    | 6 commands (help, exit, clear, models, provider, styles) |
| Streaming responses    | ✅ Complete |                                                          |
| Tool calling loop      | ✅ Complete | Up to 10 iterations                                      |

### What Open-CLI Lacks ❌

| Feature                            | Priority | Effort   | Impact |
| ---------------------------------- | -------- | -------- | ------ |
| AGENTS.md context files            | P1       | 3-4 days | High   |
| Enhanced @ files (dirs, git-aware) | P1       | 2 days   | High   |
| Shell passthrough (!)              | P1       | 1 day    | Medium |
| Headless mode (-p flag)            | P1       | 1 day    | High   |
| Session checkpointing              | P2       | 2-3 days | Medium |
| MCP Server support                 | P2       | 5-7 days | High   |
| Custom commands                    | P2       | 2 days   | Medium |
| JSON output mode                   | P3       | 1 day    | Medium |
| /stats, /compress commands         | P3       | 1 day    | Low    |
| Token caching                      | P4       | 2-3 days | Medium |

---

## Phase 1: Core UX Improvements (7-8 days)

### 1.1 Headless Mode (`-p` flag)

**Priority:** P1 | **Effort:** 1 day | **Impact:** High

Enable non-interactive usage for scripting and automation.

#### Specification

```bash
# Single prompt, exit after response
open-cli -p "Explain this codebase"

# JSON output for parsing
open-cli -p "List all TODOs" --output-format json

# Stream JSON events
open-cli -p "Run tests" --output-format stream-json
```

#### Implementation

**File:** `src/index.ts`

- Add `-p, --prompt <text>` flag
- Add `--output-format <text|json|stream-json>` flag
- Add `--model <id>` flag for non-interactive model selection
- Skip interactive mode when `-p` is provided

**File:** `src/cli/headless.ts` (new)

```typescript
export interface HeadlessOptions {
  prompt: string;
  outputFormat: "text" | "json" | "stream-json";
  model?: string;
}

export async function runHeadless(
  provider: Provider,
  options: HeadlessOptions,
): Promise<void> {
  // Execute single prompt and output result
}
```

**File:** `src/cli/chat.ts`

- Refactor chat logic to be reusable by headless mode

#### Tests

- `tests/cli/headless.test.ts` - Unit tests for headless mode
- Test JSON output format
- Test stream-json output format

---

### 1.2 Enhanced @ File Inclusion

**Priority:** P1 | **Effort:** 2 days | **Impact:** High

Extend the existing `@` syntax with directories, glob patterns, and git-aware filtering.

#### Specification

```
@src/index.ts          # Single file (existing)
@src/                  # All files in directory
@src/**/*.ts           # Glob pattern
@src/**/*.ts @lib/     # Multiple patterns
```

Git-aware filtering (skip node_modules, .git, dist, .env, etc.)

#### Implementation

**File:** `src/context/files.ts`

- Add `scanDirectory(path)` - recursively read files in directory
- Add `resolveGlobPattern(pattern)` - expand glob patterns
- Add `isGitIgnored(path)` - check .gitignore rules
- Add `MAX_TOTAL_SIZE` limit (e.g., 500KB total context)
- Enhance `parseFileReferences()` to handle directories

**File:** `src/context/gitignore.ts` (new)

```typescript
export async function loadGitignore(
  cwd: string,
): Promise<(path: string) => boolean>;
export function getDefaultIgnores(): string[]; // node_modules, .git, etc.
```

**File:** `src/context/files.ts` - Update `buildFileContext()`

- Aggregate multiple files
- Show summary of included files
- Truncate if total exceeds limit

#### Tests

- `tests/context/gitignore.test.ts`
- `tests/context/files.test.ts` - Add tests for directories and globs

---

### 1.3 Shell Passthrough (`!`)

**Priority:** P1 | **Effort:** 1 day | **Impact:** Medium

Allow direct shell command execution from the prompt.

#### Specification

```
!ls -la           # Execute shell command, show output
!git status       # Works like terminal
!                 # Toggle shell mode (all input goes to shell)
```

#### Implementation

**File:** `src/cli/chat.ts`

- Detect `!` prefix before command parsing
- Handle shell mode toggle

**File:** `src/cli/shell-passthrough.ts` (new)

```typescript
export function isShellPassthrough(input: string): boolean;
export async function executeShellPassthrough(command: string): Promise<string>;
export function formatShellOutput(output: string, isError: boolean): string;
```

**File:** `src/cli/commands.ts`

- No changes needed (handled before command parsing)

#### Tests

- `tests/cli/shell-passthrough.test.ts`

---

### 1.4 AGENTS.md Context System

**Priority:** P1 | **Effort:** 3-4 days | **Impact:** High

Implement hierarchical context files similar to Gemini-CLI's GEMINI.md.

#### Specification

Context files are loaded hierarchically:

1. `~/.open-cli/AGENTS.md` - Global user context
2. `<project>/AGENTS.md` - Project context (and parent directories)
3. `<subdir>/AGENTS.md` - JIT context when accessing files in that directory

```
# Example AGENTS.md
## Project Instructions
- Use TypeScript strict mode
- Follow existing code patterns
- Add JSDoc comments to public functions

## Code Style
- 2 space indentation
- Prefer const over let
```

#### Commands

```
/memory show       # Display loaded context
/memory add <text> # Add to global AGENTS.md
/memory refresh    # Reload all context files
/memory list       # List AGENTS.md files being used
```

#### Implementation

**File:** `src/context/memory.ts` (new)

```typescript
export interface MemoryFile {
  path: string;
  content: string;
  tier: "global" | "project" | "jit";
}

export async function loadHierarchicalMemory(
  cwd: string,
): Promise<MemoryFile[]>;
export async function findAgentsMdFiles(startDir: string): Promise<string[]>;
export async function appendToGlobalMemory(text: string): Promise<void>;
```

**File:** `src/context/agents-md.ts` (new)

```typescript
export const AGENTS_MD_NAMES = ["AGENTS.md", "CONTEXT.md", ".agents.md"];

export async function parseAgentsMd(filePath: string): Promise<string>;
export function supportsImports(content: boolean); // @file.md syntax
```

**File:** `src/tools/systemPrompt.ts`

- Include loaded AGENTS.md content in system prompt
- Show count of loaded context files in footer

**File:** `src/cli/commands.ts`

- Add `/memory` command with subcommands

**File:** `src/config/settings.ts`

- Add `context.fileName` setting (customizable context file names)

#### Tests

- `tests/context/memory.test.ts`
- `tests/context/agents-md.test.ts`

---

## Phase 2: Productivity & Extensibility (9-12 days)

### 2.1 Session Checkpointing

**Priority:** P2 | **Effort:** 2-3 days | **Impact:** Medium

Save and resume conversation sessions.

#### Specification

```
/chat save <tag>      # Save current session
/chat list            # List saved sessions
/chat resume <tag>    # Resume a session
/chat delete <tag>    # Delete a session
/chat share [file]    # Export to markdown/JSON
```

Sessions stored in `~/.open-cli/sessions/<project-hash>/<tag>.json`

#### Implementation

**File:** `src/session/store.ts` (new)

```typescript
export interface Session {
  id: string;
  tag: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  projectHash: string;
}

export async function saveSession(session: Session): Promise<void>;
export async function loadSession(
  tag: string,
  projectHash: string,
): Promise<Session | null>;
export async function listSessions(projectHash: string): Promise<Session[]>;
export async function deleteSession(
  tag: string,
  projectHash: string,
): Promise<void>;
```

**File:** `src/session/hash.ts` (new)

```typescript
export function getProjectHash(cwd: string): string;
```

**File:** `src/cli/commands.ts`

- Add `/chat` command with subcommands

#### Tests

- `tests/session/store.test.ts`

---

### 2.2 MCP Server Support

**Priority:** P2 | **Effort:** 5-7 days | **Impact:** High

Implement Model Context Protocol for external tool integration.

#### Specification

```json
// ~/.open-cli/settings.json
{
  "mcpServers": {
    "github": {
      "command": "mcp-server-github",
      "env": { "GITHUB_TOKEN": "$GITHUB_TOKEN" }
    },
    "database": {
      "url": "http://localhost:8080/sse",
      "headers": { "Authorization": "Bearer token" }
    }
  }
}
```

Commands:

```
/mcp              # List MCP servers and tools
/mcp refresh      # Reconnect to all servers
/mcp desc         # Show tool descriptions
```

#### Implementation

**File:** `src/mcp/types.ts` (new)

```typescript
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
  parameters: JSONSchema;
  serverName: string;
}
```

**File:** `src/mcp/client.ts` (new)

```typescript
export class MCPClient {
  async connect(config: MCPServerConfig): Promise<void>;
  async discoverTools(): Promise<MCPTool[]>;
  async executeTool(
    name: string,
    args: Record<string, unknown>,
  ): Promise<string>;
  async disconnect(): Promise<void>;
}
```

**File:** `src/mcp/transport.ts` (new)

```typescript
export class StdioTransport {
  /* stdin/stdout communication */
}
export class SSETransport {
  /* Server-Sent Events */
}
export class HTTPTransport {
  /* Streamable HTTP */
}
```

**File:** `src/mcp/discovery.ts` (new)

```typescript
export async function discoverMCPServers(
  config: Record<string, MCPServerConfig>,
): Promise<Map<string, MCPTool[]>>;
```

**File:** `src/tools/executor.ts`

- Integrate MCP tools with built-in tools
- Handle tool name conflicts (prefix with server name)

**File:** `src/config/settings.ts`

- Load MCP server configuration

#### Tests

- `tests/mcp/client.test.ts`
- `tests/mcp/transport.test.ts`
- `tests/mcp/discovery.test.ts`

---

### 2.3 Custom Commands

**Priority:** P2 | **Effort:** 2 days | **Impact:** Medium

User-defined slash commands from TOML files.

#### Specification

```toml
# ~/.open-cli/commands/review.toml
name = "review"
description = "Review code for issues"
prompt = """
Review this code for bugs, security issues, and improvements:

@{{args}}

Focus on:
- Logic errors
- Security vulnerabilities
- Performance issues
"""
```

Commands:

```
/commands reload    # Reload command definitions
/review src/auth.ts # Execute custom command
```

#### Implementation

**File:** `src/commands/loader.ts` (new)

```typescript
export interface CustomCommand {
  name: string;
  description: string;
  prompt: string;
}

export async function loadCommands(
  dir: string,
): Promise<Map<string, CustomCommand>>;
```

**File:** `src/commands/executor.ts` (new)

```typescript
export async function executeCustomCommand(
  cmd: CustomCommand,
  args: string,
): Promise<string>;
```

**File:** `src/cli/commands.ts`

- Add `/commands` command
- Integrate custom commands with built-in commands

#### Tests

- `tests/commands/loader.test.ts`
- `tests/commands/executor.test.ts`

---

### 2.4 Additional Slash Commands

**Priority:** P3 | **Effort:** 1 day | **Impact:** Low

Add more utility commands.

#### New Commands

```
/stats          # Show token usage, session duration
/compress       # Summarize context to save tokens
/copy           # Copy last response to clipboard
/about          # Show version info
/tools          # List available tools (with descriptions)
/tools desc     # Show detailed tool descriptions
```

#### Implementation

**File:** `src/cli/commands.ts`

- Add each new command

**File:** `src/cli/stats.ts` (new)

```typescript
export interface SessionStats {
  messagesCount: number;
  estimatedTokens: number;
  duration: number;
}

export function calculateStats(state: ChatState): SessionStats;
```

---

## Phase 3: Polish (3-4 days)

### 3.1 JSON Output Mode

**Priority:** P3 | **Effort:** 1 day

Structured output for scripting:

```bash
open-cli -p "List files" --output-format json
```

Output:

```json
{
  "response": "...",
  "toolCalls": [...],
  "stats": { "tokens": 1234, "duration": 5.2 }
}
```

### 3.2 Token Caching

**Priority:** P4 | **Effort:** 2-3 days

Cache repeated context (AGENTS.md, file contexts) to reduce token usage.

---

## File Structure After Implementation

```
src/
├── cli/
│   ├── chat.ts
│   ├── commands.ts
│   ├── headless.ts          # NEW
│   ├── prompt.ts
│   ├── renderer.ts
│   ├── shell-passthrough.ts # NEW
│   └── stats.ts             # NEW
├── commands/                 # NEW
│   ├── loader.ts
│   └── executor.ts
├── config/
│   ├── env.ts
│   └── settings.ts          # ENHANCED
├── context/
│   ├── agents-md.ts         # NEW
│   ├── files.ts             # ENHANCED
│   ├── gitignore.ts         # NEW
│   └── memory.ts            # NEW
├── mcp/                      # NEW
│   ├── client.ts
│   ├── discovery.ts
│   ├── transport.ts
│   └── types.ts
├── session/                  # NEW
│   ├── hash.ts
│   └── store.ts
├── tools/
│   └── ...
└── index.ts                  # ENHANCED
```

---

## Dependencies to Add

```json
{
  "dependencies": {
    "ignore": "^6.0.0",
    "@toml-tools/parser": "^0.3.0"
  }
}
```

---

## Testing Strategy

Each feature requires:

1. Unit tests for new modules
2. Integration tests for command handling
3. Manual testing checklist

---

## Risk Mitigation

| Risk                   | Mitigation                                |
| ---------------------- | ----------------------------------------- |
| MCP protocol changes   | Pin MCP SDK version, monitor spec updates |
| Large context files    | Enforce size limits, truncate gracefully  |
| Session data loss      | Atomic writes, backup on save             |
| Shell command security | Confirmation for destructive commands     |

---

## Success Metrics

- [ ] Headless mode works for CI/CD pipelines
- [ ] AGENTS.md loads from 3+ hierarchy levels
- [ ] @ directories include 50+ files efficiently
- [ ] MCP servers connect within 5 seconds
- [ ] Sessions persist across restarts
- [ ] All tests pass (>90% coverage on new code)

---

## Implementation Log

| Date       | Feature                          | Status | Notes                                              |
| ---------- | -------------------------------- | ------ | -------------------------------------------------- |
| 2026-02-19 | 1.1 Headless Mode                | Done   | -p flag, --output-format json/stream-json           |
| 2026-02-19 | 1.2 Enhanced @ File Inclusion    | Done   | Dirs, globs, .gitignore filtering                   |
| 2026-02-19 | 1.3 Shell Passthrough            | Done   | !command syntax and shell mode toggle               |
| 2026-02-19 | 1.4 AGENTS.md Context System     | Done   | Hierarchical global/project/jit memory              |
| 2026-02-19 | 2.1 Session Checkpointing        | Done   | save/list/resume/delete with project hashing        |
| 2026-02-19 | 2.2 MCP Server Support           | Done   | Client, registry, stdio transport                   |
| 2026-02-19 | 2.3 Custom Commands              | Done   | TOML loader with {{args}} replacement               |
| 2026-02-19 | 2.4 /stats, /copy, /export       | Done   | Session stats, clipboard copy, md/json export       |
| 2026-02-19 | 2.4 /about, /tools, /compress    | Done   | Version info, tool listing, context compression     |
| 2026-02-19 | 3.1 JSON Output Mode             | Done   | text/json/stream-json in headless mode              |
| 2026-02-19 | 3.2 Token Caching                | Done   | mtime-based file cache, system prompt cache         |
