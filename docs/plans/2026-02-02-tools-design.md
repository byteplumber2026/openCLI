# Tools Feature Design

Add shell and file operation tools to open_cli, allowing the LLM to execute commands and manipulate files on behalf of the user.

## Overview

**Goal:** Enable the LLM to perform coding tasks by executing shell commands and file operations.

**Approach:** Use native function calling (tool use) with smart confirmation - auto-execute read operations, confirm destructive operations.

## Tool Definitions

5 tools available to the LLM:

### shell_run
Execute a shell command and return output.
```typescript
{
  name: 'shell_run',
  parameters: {
    command: string,    // The command to run
    workdir?: string    // Optional working directory
  }
}
```

### file_read
Read the contents of a file.
```typescript
{
  name: 'file_read',
  parameters: {
    path: string        // File path to read
  }
}
```

### file_write
Write content to a file (creates or overwrites).
```typescript
{
  name: 'file_write',
  parameters: {
    path: string,       // File path to write
    content: string     // Content to write
  }
}
```

### file_list
List files in a directory.
```typescript
{
  name: 'file_list',
  parameters: {
    path: string,       // Directory path
    recursive?: boolean // Include subdirectories
  }
}
```

### file_search
Search for text pattern in files.
```typescript
{
  name: 'file_search',
  parameters: {
    pattern: string,    // Regex pattern to search
    path?: string,      // Directory to search in
    glob?: string       // File pattern (e.g., "*.ts")
  }
}
```

## Architecture

### New Files

```
src/
├── tools/
│   ├── types.ts          # Tool interfaces and definitions
│   ├── executor.ts       # Executes tools, handles confirmation
│   ├── shell.ts          # shell_run implementation
│   ├── files.ts          # file_read, file_write, file_list, file_search
│   ├── systemPrompt.ts   # Coding-focused system prompt
│   └── index.ts          # Exports all tools
```

### Updated Files

- `src/providers/types.ts` - Add tool call types to Message
- `src/providers/openai.ts` - Support tool calling
- `src/providers/gemini.ts` - Support tool calling
- `src/providers/grok.ts` - Support tool calling
- `src/cli/chat.ts` - Handle tool calls in chat loop

## Provider Interface Updates

```typescript
// New types for tool calling
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
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

// Update Message to support tool calls
export interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  toolCalls?: ToolCall[];      // Assistant requests tools
  toolCallId?: string;         // Tool result references this
}

// Update ChatOptions
export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  tools?: ToolDefinition[];    // Add tools to send to LLM
}

// Update StreamChunk
export interface StreamChunk {
  content: string;
  done: boolean;
  toolCalls?: ToolCall[];      // Tool calls can come in chunks
}
```

## Execution Flow

1. User sends message
2. Message + tools definition sent to LLM
3. LLM responds with either:
   - Text response → display to user
   - Tool call → execute tool → send result back to LLM → goto 3
4. Loop until LLM gives final text response

## Confirmation Logic

```typescript
const SAFE_OPERATIONS = ['file_read', 'file_list', 'file_search'];
const SAFE_COMMANDS = [
  /^ls\b/, /^cat\b/, /^pwd$/, /^echo\b/,
  /^head\b/, /^tail\b/, /^grep\b/, /^find\b/, /^which\b/
];

function needsConfirmation(tool: string, args: any): boolean {
  if (SAFE_OPERATIONS.includes(tool)) return false;
  if (tool === 'shell_run' && SAFE_COMMANDS.some(r => r.test(args.command))) return false;
  return true;
}
```

## Display Format

Tool execution shown inline:

```
You: Create a hello world file
Assistant: I will create a hello.txt file with "Hello World".

[file_write] hello.txt
? Allow write to hello.txt? (Y/n) y
[Done] Wrote 12 bytes to hello.txt

The file has been created successfully.
```

**Confirmation prompt (for destructive operations):**

```
[file_write] src/index.ts
? Allow write to src/index.ts? (Y/n) 
```

User presses Y to allow, N to deny.

## System Prompt

```typescript
export const TOOL_SYSTEM_PROMPT = `You are a helpful coding assistant with access to tools.

## Available Tools
- shell_run: Execute shell commands
- file_read: Read file contents
- file_write: Write/create files
- file_list: List directory contents
- file_search: Search for text in files

## Guidelines
1. Read before modifying - Always read a file before editing it
2. Explain your actions - Tell the user what you are about to do
3. Use appropriate tools - Prefer file_read over cat, file_list over ls
4. Be cautious - For destructive operations, explain the impact first
5. Handle errors gracefully - If a command fails, explain why

## Working Directory
Current directory: {{cwd}}
`;
```

## Error Handling

| Scenario | Handling |
|----------|----------|
| Command fails (exit \!= 0) | Show stderr, send error to LLM |
| File not found | Send error to LLM |
| Permission denied | Show error, suggest fix |
| Command timeout (>30s) | Kill process, notify LLM |
| User rejects confirmation | Tell LLM "User declined" |
| Invalid tool arguments | Return validation error |

