# Phase 4: Production Hardening — Design

> Goal: Make open-cli reliable for daily use with structured logging, error recovery, and token/cost visibility.

---

## 4.1 Structured Logging & Debugging

### Problem

The entire app uses `console.log()`. No way to debug API issues, trace tool execution, or understand what went wrong.

### Solution

Add a `pino`-based logger. Silent in normal mode. In `--verbose` / `--debug` mode, logs to stderr (doesn't interfere with stdout output) and optionally to `~/.open-cli/logs/`.

### New Files

**`src/logging/logger.ts`** — Singleton logger

```typescript
export type LogLevel = "debug" | "info" | "warn" | "error" | "silent";

export function createLogger(level: LogLevel): Logger;
export function getLogger(): Logger;
export function setLogLevel(level: LogLevel): void;
```

- `debug`: Verbose API payloads, tool args, file cache hits
- `info`: Provider connected, tool executed, session saved
- `warn`: Approaching token limits, slow responses, retries
- `error`: API failures, tool crashes, config issues
- `silent`: Default — no logging output

**`src/logging/trace.ts`** — API request/response tracer

```typescript
export function traceRequest(provider: string, model: string, messageCount: number, tokenCount: number): TraceContext;
export function traceResponse(ctx: TraceContext, outputTokens: number, toolCalls: number, durationMs: number): void;
export function traceToolExecution(toolName: string, args: Record<string, unknown>, durationMs: number, resultSize: number): void;
```

### Integration Points

| File | What to log |
|------|-------------|
| `src/index.ts` | Add `--verbose` / `--debug` CLI flags, initialize logger |
| `src/providers/*.ts` | Request payload size, response time, errors |
| `src/tools/executor.ts` | Tool name, args, duration, result size |
| `src/cli/chat.ts` | Conversation loop events, iteration count |
| `src/mcp/client.ts` | Server connections, tool discovery, execution |

### Config

Add to `settings.ts`:

```typescript
logging: {
  level: "silent" | "info" | "debug";
  file: boolean;  // Write to ~/.open-cli/logs/
}
```

---

## 4.2 Error Recovery & Retries

### Problem

A single API timeout or rate-limit kills the conversation. User loses their message.

### Solution

Retry wrapper with exponential backoff. Typed error classification. User feedback during retries.

### New Files

**`src/providers/retry.ts`** — Retry wrapper

```typescript
export interface RetryOptions {
  maxRetries: number;     // Default: 3
  baseDelayMs: number;    // Default: 1000
  maxDelayMs: number;     // Default: 10000
}

export async function* withRetry<T>(
  fn: () => AsyncIterable<T>,
  options?: RetryOptions,
  onRetry?: (attempt: number, delayMs: number, error: Error) => void,
): AsyncIterable<T>;

export function isRetryable(error: unknown): boolean;
export function getRetryDelay(attempt: number, baseDelay: number, retryAfter?: number): number;
```

Retryable errors: 429, 500, 502, 503, ECONNRESET, ETIMEDOUT, fetch failures.
Non-retryable: 401, 400, 404, invalid JSON.

**`src/providers/errors.ts`** — Typed error classes

```typescript
export class ProviderError extends Error {
  constructor(message: string, public readonly statusCode?: number, public readonly retryable: boolean = false);
}
export class RateLimitError extends ProviderError { retryAfterMs?: number; }
export class NetworkError extends ProviderError { /* always retryable */ }
export class AuthError extends ProviderError { /* never retryable */ }
```

### Integration Points

| File | Change |
|------|--------|
| `src/cli/chat.ts` | Wrap `provider.chat()` with `withRetry()`. Show "Retrying in 2s... (2/3)" via `onRetry`. On final failure, keep user message, show clear error. |
| `src/tools/executor.ts` | Retry `web_search` and `http_request` tools (network tools only). |
| `src/providers/*.ts` | Parse API errors into typed error classes. |

### Behavior

```
User: explain this code
  → API call fails (502)
  → "Retrying in 1s... (attempt 1/3)"
  → API call fails (502)
  → "Retrying in 2s... (attempt 2/3)"
  → API call succeeds
  → Normal response
```

On final failure:
```
Error: Provider unavailable after 3 attempts. Your message is preserved — try again or /provider to switch.
```

---

## 4.3 Token Counting & Cost Tracking

### Problem

No visibility into token usage. `/stats` estimates by dividing characters by 4. No context window warnings. No cost visibility.

### Solution

Accurate token counting via `js-tiktoken`. Per-session usage tracking. Context window warnings. Cost estimation from a pricing table.

### New Files

**`src/providers/tokens.ts`** — Token counting

```typescript
export function countTokens(text: string, model: string): number;
export function countMessageTokens(messages: Message[], model: string): number;
export function estimateCost(inputTokens: number, outputTokens: number, model: string): number;

export const MODEL_PRICING: Record<string, { input: number; output: number }>;
// Prices per 1M tokens:
// gpt-4o: $2.50 / $10.00
// gpt-4o-mini: $0.15 / $0.60
// gpt-4-turbo: $10.00 / $30.00
// gemini-2.0-flash: $0.10 / $0.40
// gemini-1.5-pro: $1.25 / $5.00
// grok-2: $2.00 / $10.00
```

Uses `js-tiktoken` with `cl100k_base` encoding for OpenAI models. Falls back to character/4 for unknown models.

**`src/providers/usage.ts`** — Session usage tracker

```typescript
export interface UsageStats {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
  requestCount: number;
}

export class UsageTracker {
  track(inputTokens: number, outputTokens: number, model: string): void;
  getStats(): UsageStats;
  reset(): void;
}
```

### Integration Points

| File | Change |
|------|--------|
| `src/cli/chat.ts` | Before `provider.chat()`: count message tokens, warn if >80% of context window. After response: track usage. |
| `src/cli/stats.ts` | Enhance to show accurate tokens, cost, context window %. Accept `UsageTracker` and model info. |
| `src/cli/commands.ts` | Add `UsageTracker` to `ChatState`. Pass to `/stats` handler. |
| `src/providers/types.ts` | Add `contextWindow` lookup helper. |

### Enhanced `/stats` Output

```
Session Statistics:
  Messages: 12 (6 user, 6 assistant)
  Tool calls: 3
  Tokens: 4,521 in / 2,103 out (6,624 total)
  Cost: ~$0.034
  Context: 5% of 128K window
```

### Context Window Warning

Shown before each API call when usage is high:

```
⚠ 85% of context window used (109K/128K). Consider /compress or /clear.
```

---

## Dependencies

```json
{
  "pino": "^9.0.0",
  "js-tiktoken": "^1.0.0"
}
```

---

## File Structure After Implementation

```
src/
├── logging/          # NEW
│   ├── logger.ts     # Singleton pino logger
│   └── trace.ts      # API request/response tracing
├── providers/
│   ├── errors.ts     # NEW — typed error classes
│   ├── retry.ts      # NEW — retry with backoff
│   ├── tokens.ts     # NEW — token counting + pricing
│   ├── usage.ts      # NEW — session usage tracker
│   ├── types.ts      # MODIFIED — add usage types
│   ├── openai.ts     # MODIFIED — error classification, tracing
│   ├── gemini.ts     # MODIFIED — error classification, tracing
│   ├── grok.ts       # MODIFIED — error classification, tracing
│   └── minimax.ts    # MODIFIED — error classification, tracing
├── cli/
│   ├── chat.ts       # MODIFIED — retries, token warnings, usage tracking
│   ├── commands.ts   # MODIFIED — UsageTracker in ChatState
│   └── stats.ts      # MODIFIED — accurate tokens, cost, context %
├── config/
│   └── settings.ts   # MODIFIED — logging config
└── index.ts          # MODIFIED — --verbose/--debug flags
```
