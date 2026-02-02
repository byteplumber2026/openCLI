# open_cli Design Document

An open-source CLI AI assistant supporting multiple LLM providers (OpenAI, Grok, Minimax).

## Overview

open_cli is a terminal-based AI assistant inspired by gemini-cli, but with multi-provider support. Users can switch between OpenAI, Grok (xAI), and Minimax models based on preference or availability.

**MVP Scope:** Interactive chat with file context support. No shell commands or MCP in v1.

## Project Structure

```
open_cli/
├── src/
│   ├── index.ts              # Entry point, CLI setup
│   ├── cli/
│   │   ├── prompt.ts         # Interactive provider/model selection
│   │   ├── chat.ts           # Main chat loop, input handling
│   │   └── renderer.ts       # Streaming markdown output
│   ├── providers/
│   │   ├── interface.ts      # Provider interface definition
│   │   ├── openai.ts         # OpenAI implementation
│   │   ├── grok.ts           # Grok (xAI) implementation
│   │   └── minimax.ts        # Minimax implementation
│   ├── context/
│   │   ├── files.ts          # File reading and context building
│   │   └── project.ts        # Project detection, .open_cli config
│   └── config/
│       ├── settings.ts       # User preferences (~/.open_cli/)
│       └── env.ts            # Environment variable handling
├── package.json
├── tsconfig.json
└── README.md
```

## Provider Interface

```typescript
interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

interface StreamChunk {
  content: string;
  done: boolean;
}

interface Model {
  id: string;
  name: string;
  contextWindow: number;
}

interface Provider {
  name: string;
  chat(messages: Message[], options?: ChatOptions): AsyncIterable<StreamChunk>;
  listModels(): Promise<Model[]>;
  validateApiKey(): Promise<boolean>;
}
```

### Provider Implementations

| Provider | SDK | Models | API Key Env Var |
|----------|-----|--------|-----------------|
| OpenAI | `openai` npm | gpt-4o, gpt-4-turbo, gpt-3.5-turbo | `OPENAI_API_KEY` |
| Grok | OpenAI-compatible API | grok-2, grok-2-mini | `XAI_API_KEY` |
| Minimax | Minimax API | abab6.5, abab5.5 | `MINIMAX_API_KEY` |

## Interactive Startup Flow

1. Check `~/.open_cli/config.json` for saved preferences
2. Scan environment for available API keys
3. If no default provider set, show interactive selector:

```
Welcome to open_cli!

Available providers (API key detected):
  ❯ OpenAI (gpt-4o)
    Grok (grok-2)

Unavailable (no API key):
    Minimax - set MINIMAX_API_KEY

Use arrow keys to select, Enter to confirm
Save as default? (Y/n)
```

4. After provider selection, let user pick model
5. Save preference to config if user agrees
6. Enter chat loop

## Configuration

**Location:** `~/.open_cli/config.json`

```json
{
  "defaultProvider": "openai",
  "defaultModel": "gpt-4o",
  "preferences": {
    "temperature": 0.7,
    "saveHistory": false
  },
  "styles": {
    "promptColor": "cyan",
    "codeTheme": "monokai"
  }
}
```

## Chat Interface

**Prompt format:**
```
open_cli (openai/gpt-4o) > your message here
```

### Built-in Commands

| Command | Description |
|---------|-------------|
| `/models` | Switch model (shows selector for current provider) |
| `/provider` | Switch provider entirely |
| `/file <path>` | Add file to context for this message |
| `/styles` | Change terminal color theme |
| `/clear` | Clear conversation history |
| `/help` | Show available commands |
| `/exit` | Quit (also Ctrl+C) |

### File Context

Two syntax options:
- Explicit: `/file src/index.ts`
- Inline: `@src/index.ts` (like Cursor/Claude)

**Glob patterns supported:**
```
/file src/providers/*.ts
```

**Context injection format:**
```
<file path="src/index.ts" language="typescript">
// file contents
</file>

User's question here
```

**Limits:**
- Max 100KB per file
- Max 10 files per query
- Binary files skipped

## Dependencies

### Runtime

| Package | Purpose |
|---------|---------|
| `@inquirer/prompts` | Interactive selection UI |
| `openai` | OpenAI SDK (also for Grok) |
| `chalk` | Terminal colors |
| `marked` + `marked-terminal` | Markdown rendering |
| `shiki` | Syntax highlighting |
| `fast-glob` | File pattern matching |
| `commander` | CLI argument parsing |
| `conf` | Config file management |

### Development

| Package | Purpose |
|---------|---------|
| `typescript` | Type safety |
| `tsup` | Bundling |
| `vitest` | Testing |
| `eslint` + `prettier` | Code quality |

**Node.js requirement:** v20+

## Error Handling

| Error | Handling |
|-------|----------|
| Invalid API key | Clear message, prompt to check env var, offer to switch provider |
| Rate limited | Display retry-after, pause and retry automatically |
| Network failure | Retry with exponential backoff (3 attempts) |
| Context too long | Warn user, offer to clear history or reduce file context |
| File not found | Clear error message, continue chat |
| File too large | Truncate with warning |
| Binary file | Skip with message |

**Streaming interruption:**
- Ctrl+C → stop stream cleanly, keep partial response in history
- Connection drop → show what was received, offer to retry

## Future Enhancements (Post-MVP)

- Shell command execution
- MCP server integration
- Conversation history/checkpointing
- More providers (Anthropic, Mistral, local models)
- System keychain integration for API keys
- Project-level `.open_cli.json` config
