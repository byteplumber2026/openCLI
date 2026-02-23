# Core Concepts

This document explains the fundamental concepts behind Open-CLI, including providers, models, tokens, and context management.

## Providers

Open-CLI supports multiple AI providers, giving you flexibility in choosing the best model for your needs.

### Supported Providers

| Provider      | Environment Variable  | Best For                              |
| ------------- | --------------------- | ------------------------------------- |
| OpenAI        | `OPENAI_API_KEY`      | General purpose, best tool support    |
| Google Gemini | `GOOGLE_API_KEY`      | Large context windows, fast responses |
| xAI Grok      | `XAI_API_KEY`         | Creative tasks, X integration         |
| Minimax       | `MINIMAX_API_KEY`     | Cost-effective, Chinese language      |
| DeepSeek      | `DEEPSEEK_API_KEY`    | Reasoning tasks, cost-effective       |
| OpenRouter    | `OPENROUTER_API_KEY`  | Access 15+ models under one API key   |

### Setting Up Providers

Set environment variables before running Open-CLI:

```bash
# Single provider
export OPENAI_API_KEY=sk-...

# Multiple providers (Open-CLI will prompt you to choose)
export OPENAI_API_KEY=sk-...
export GOOGLE_API_KEY=AI...
export XAI_API_KEY=x...
```

When multiple providers are available, use `/provider` to switch between them:

```
> /provider
? Select a provider:
  ▸ openai
    gemini
    grok
    minimax
    deepseek
    openrouter
```

## Models

Each provider offers different models with varying capabilities, context windows, and pricing.

### OpenAI Models

| Model ID        | Name          | Context Window | Notes                 |
| --------------- | ------------- | -------------- | --------------------- |
| `gpt-4o`        | GPT-4o        | 128K           | Latest flagship model |
| `gpt-4o-mini`   | GPT-4o Mini   | 128K           | Fast, cost-effective  |
| `gpt-4-turbo`   | GPT-4 Turbo   | 128K           | Previous flagship     |
| `gpt-3.5-turbo` | GPT-3.5 Turbo | 16K            | Budget option         |

### Google Gemini Models

| Model ID           | Name             | Context Window | Notes           |
| ------------------ | ---------------- | -------------- | --------------- |
| `gemini-2.0-flash` | Gemini 2.0 Flash | 1M             | Latest, fastest |
| `gemini-1.5-pro`   | Gemini 1.5 Pro   | 2M             | Largest context |
| `gemini-1.5-flash` | Gemini 1.5 Flash | 1M             | Balanced        |

### xAI Grok Models

| Model ID      | Name        | Context Window | Notes           |
| ------------- | ----------- | -------------- | --------------- |
| `grok-2`      | Grok 2      | 128K           | Latest flagship |
| `grok-2-mini` | Grok 2 Mini | 128K           | Fast variant    |

### Minimax Models

| Model ID       | Name          | Context Window | Notes         |
| -------------- | ------------- | -------------- | ------------- |
| `abab6.5-chat` | ABAB 6.5 Chat | 245K           | Latest model  |
| `abab5.5-chat` | ABAB 5.5 Chat | 16K            | Budget option |

### DeepSeek Models

| Model ID              | Name        | Context Window | Notes                    |
| --------------------- | ----------- | -------------- | ------------------------ |
| `deepseek-chat`       | DeepSeek V3 | 64K            | General purpose flagship |
| `deepseek-reasoner`   | DeepSeek R1 | 64K            | Reasoning / thinking     |

### OpenRouter Models (curated)

| Model ID                                | Name              | Context Window |
| --------------------------------------- | ----------------- | -------------- |
| `anthropic/claude-opus-4-5`             | Claude Opus 4.5   | 200K           |
| `anthropic/claude-sonnet-4-5`           | Claude Sonnet 4.5 | 200K           |
| `anthropic/claude-haiku-4-5`            | Claude Haiku 4.5  | 200K           |
| `meta-llama/llama-3.3-70b-instruct`     | Llama 3.3 70B     | 128K           |
| `meta-llama/llama-3.1-405b-instruct`    | Llama 3.1 405B    | 128K           |
| `google/gemini-2.0-flash-001`           | Gemini 2.0 Flash  | 1M             |
| `google/gemini-2.5-pro-preview`         | Gemini 2.5 Pro    | 1M             |
| `mistralai/mistral-large-2411`          | Mistral Large     | 128K           |
| `mistralai/codestral-2501`              | Codestral         | 256K           |
| `deepseek/deepseek-r1`                  | DeepSeek R1       | 64K            |
| `deepseek/deepseek-chat-v3-0324`        | DeepSeek V3       | 64K            |
| `x-ai/grok-3`                           | Grok 3            | 131K           |
| `openai/gpt-4o`                         | GPT-4o            | 128K           |
| `openai/o3-mini`                        | o3-mini           | 200K           |
| `qwen/qwen-2.5-72b-instruct`            | Qwen 2.5 72B      | 128K           |

### Selecting Models

Use `/models` to see available models and switch:

```
> /models
? Select a model:
  ▸ gpt-4o
    gpt-4o-mini
    gpt-4-turbo
    gpt-3.5-turbo
```

Or use command line flags:

```bash
opencli -m gpt-4o-mini
opencli --provider gemini -m gemini-2.0-flash
```

## Tokens

Tokens are the basic units that AI models process. Understanding tokens helps you manage costs and context limits.

### How Tokens Work

- 1 token ≈ 4 characters of English text
- ~750 words per 1000 tokens
- API pricing is per 1K tokens (input and output)

### Token Counting

Open-CLI automatically tracks token usage:

```
> /stats
Messages: 10 (5 user, 5 assistant)
Tool calls: 3
Tokens: 12,500 in / 3,200 out (15,700 total)
Cost: ~$0.047
Context: 12% of 128K window
```

### Context Window

Each model has a maximum context window - the total tokens it can process in a single request. This includes:

- Your messages
- AI responses
- System prompt
- Tool definitions

When you approach 80% of the context window, Open-CLI warns you:

```
⚠ 85% of context window used (108.5K/128K). Consider /compress or /clear.
```

### Managing Token Usage

1. **Use `/compress`**: Summarizes conversation to save tokens
2. **Use `/clear`**: Start fresh (removes conversation history)
3. **Use smaller models**: gpt-4o-mini is cheaper than gpt-4o
4. **Include specific files**: Use `@file.ts` instead of whole directories

## Context Management

Open-CLI provides several ways to provide context to the AI.

### @ File Inclusion

Include specific files in your prompt:

```bash
@file.ts           # Single file
@src/              # All files in directory
@src/**/*.ts       # Glob pattern
@README.md @src/   # Multiple items
```

Files are added to your message automatically when you include them with `@`.

### AGENTS.md Context Files

Create context files for project-specific instructions:

| Location                | Scope                 |
| ----------------------- | --------------------- |
| `~/.open-cli/AGENTS.md` | Global (all projects) |
| `<project>/AGENTS.md`   | Project-specific      |
| `<subdir>/AGENTS.md`    | Directory-specific    |

Example AGENTS.md:

```markdown
# Project Context

This is a TypeScript Node.js project using:

- Express for API
- Prisma for database
- Jest for testing

Always use:

- async/await over promises
- TypeScript strict mode
- Jest describe/it syntax
```

Manage context with `/memory` commands:

```
/memory show     # Display loaded context
/memory add <text>  # Add to global AGENTS.md
/memory refresh  # Reload all context files
/memory list     # List AGENTS.md files in use
```

## Error Handling and Retries

Open-CLI automatically handles common errors with exponential backoff retry.

### Automatic Retries

When API requests fail due to:

- Network errors
- Rate limits (429)
- Temporary server errors (5xx)

Open-CLI retries up to 3 times with increasing delays (1s, 2s, 4s).

### Error Types

| Error Type     | Description         | Retryable                  |
| -------------- | ------------------- | -------------------------- |
| ProviderError  | API provider issues | Yes                        |
| RateLimitError | Too many requests   | Yes (respects Retry-After) |
| NetworkError   | Connection problems | Yes                        |
| AuthError      | Invalid API key     | No                         |

### Logging

Use `--verbose` or `--debug` flags to see detailed logs:

```bash
opencli --verbose        # Info level
opencli --debug          # Debug level (detailed traces)
```

Debug logs show:

- API request/response timing
- Token usage per request
- Tool execution duration
- Retry attempts
