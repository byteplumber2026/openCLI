# Phase 4: Production Hardening — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add structured logging, error recovery with retries, and token counting with cost tracking to make open-cli production-ready.

**Architecture:** Three independent modules (logging, errors/retry, tokens/usage) that integrate into the existing chat loop and provider system. Each module is built TDD — tests first, then implementation, then integration.

**Tech Stack:** pino (structured logging), js-tiktoken (token counting), vitest (testing)

---

## Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install pino and js-tiktoken**

Run: `npm install pino js-tiktoken`

**Step 2: Verify install**

Run: `npx tsc --noEmit 2>&1 | grep -v marked-terminal`
Expected: No new errors

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add pino and js-tiktoken dependencies"
```

---

## Task 2: Structured Logger

**Files:**
- Create: `src/logging/logger.ts`
- Test: `tests/logging/logger.test.ts`

**Step 1: Write the failing tests**

Create `tests/logging/logger.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { createLogger, getLogger, setLogLevel } from "../../src/logging/logger.js";

describe("Logger", () => {
  beforeEach(() => {
    setLogLevel("silent");
  });

  it("creates a logger with given level", () => {
    const logger = createLogger("info");
    expect(logger).toBeDefined();
    expect(logger.level).toBe("info");
  });

  it("getLogger returns singleton", () => {
    const a = getLogger();
    const b = getLogger();
    expect(a).toBe(b);
  });

  it("setLogLevel changes the level", () => {
    setLogLevel("debug");
    expect(getLogger().level).toBe("debug");
  });

  it("defaults to silent level", () => {
    expect(getLogger().level).toBe("silent");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/logging/logger.test.ts`
Expected: FAIL — module not found

**Step 3: Write the implementation**

Create `src/logging/logger.ts`:

```typescript
import pino from "pino";

export type LogLevel = "debug" | "info" | "warn" | "error" | "silent";

let logger: pino.Logger = pino({ level: "silent" });

export function createLogger(level: LogLevel): pino.Logger {
  logger = pino({
    level,
    transport:
      level !== "silent"
        ? { target: "pino/file", options: { destination: 2 } } // stderr
        : undefined,
  });
  return logger;
}

export function getLogger(): pino.Logger {
  return logger;
}

export function setLogLevel(level: LogLevel): void {
  logger.level = level;
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/logging/logger.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/logging/logger.ts tests/logging/logger.test.ts
git commit -m "feat(logging): add structured logger with pino"
```

---

## Task 3: API Request/Response Tracer

**Files:**
- Create: `src/logging/trace.ts`
- Test: `tests/logging/trace.test.ts`

**Step 1: Write the failing tests**

Create `tests/logging/trace.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { setLogLevel } from "../../src/logging/logger.js";
import { traceRequest, traceResponse, traceToolExecution } from "../../src/logging/trace.js";

describe("Trace", () => {
  beforeEach(() => {
    setLogLevel("silent");
  });

  it("traceRequest returns a TraceContext with start time", () => {
    const ctx = traceRequest("openai", "gpt-4o", 5, 1000);
    expect(ctx.provider).toBe("openai");
    expect(ctx.model).toBe("gpt-4o");
    expect(ctx.messageCount).toBe(5);
    expect(ctx.inputTokens).toBe(1000);
    expect(ctx.startMs).toBeGreaterThan(0);
  });

  it("traceResponse computes duration", () => {
    const ctx = traceRequest("openai", "gpt-4o", 5, 1000);
    // Should not throw
    traceResponse(ctx, 200, 1, Date.now() - ctx.startMs);
  });

  it("traceToolExecution logs without throwing", () => {
    traceToolExecution("shell_run", { command: "ls" }, 150, 512);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/logging/trace.test.ts`
Expected: FAIL — module not found

**Step 3: Write the implementation**

Create `src/logging/trace.ts`:

```typescript
import { getLogger } from "./logger.js";

export interface TraceContext {
  provider: string;
  model: string;
  messageCount: number;
  inputTokens: number;
  startMs: number;
}

export function traceRequest(
  provider: string,
  model: string,
  messageCount: number,
  inputTokens: number,
): TraceContext {
  const ctx: TraceContext = {
    provider,
    model,
    messageCount,
    inputTokens,
    startMs: Date.now(),
  };
  getLogger().debug({ ...ctx }, "api_request_start");
  return ctx;
}

export function traceResponse(
  ctx: TraceContext,
  outputTokens: number,
  toolCalls: number,
  durationMs: number,
): void {
  getLogger().info(
    {
      provider: ctx.provider,
      model: ctx.model,
      inputTokens: ctx.inputTokens,
      outputTokens,
      toolCalls,
      durationMs,
    },
    "api_request_complete",
  );
}

export function traceToolExecution(
  toolName: string,
  args: Record<string, unknown>,
  durationMs: number,
  resultSize: number,
): void {
  getLogger().info(
    { toolName, args, durationMs, resultSize },
    "tool_execution",
  );
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/logging/trace.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/logging/trace.ts tests/logging/trace.test.ts
git commit -m "feat(logging): add API request/response tracer"
```

---

## Task 4: Add --verbose/--debug CLI Flags

**Files:**
- Modify: `src/index.ts` (lines 17-31, add flags)
- Modify: `src/config/settings.ts` (add logging config)

**Step 1: Add logging config to settings.ts**

In `src/config/settings.ts`, add to the `OpenCliConfig` interface:

```typescript
logging: {
  level: string;
  file: boolean;
};
```

Add to `defaults`:

```typescript
logging: {
  level: "silent",
  file: false,
},
```

Add getter/setter:

```typescript
export function getLogLevel(): string {
  return config.get("logging.level") || "silent";
}
```

**Step 2: Add CLI flags to src/index.ts**

After the existing `.option()` calls (before `.action()`), add:

```typescript
.option("--verbose", "Enable info-level logging to stderr")
.option("--debug", "Enable debug-level logging to stderr")
```

At the top of the `.action()` callback, before provider selection, add:

```typescript
import { createLogger } from "./logging/logger.js";

// Inside action, at the top:
const logLevel = options.debug ? "debug" : options.verbose ? "info" : "silent";
createLogger(logLevel);
```

**Step 3: Verify build**

Run: `npx tsc --noEmit 2>&1 | grep -v marked-terminal`
Expected: No new errors

**Step 4: Commit**

```bash
git add src/index.ts src/config/settings.ts
git commit -m "feat(logging): add --verbose and --debug CLI flags"
```

---

## Task 5: Typed Provider Errors

**Files:**
- Create: `src/providers/errors.ts`
- Test: `tests/providers/errors.test.ts`

**Step 1: Write the failing tests**

Create `tests/providers/errors.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  ProviderError,
  RateLimitError,
  NetworkError,
  AuthError,
  classifyError,
} from "../../src/providers/errors.js";

describe("Provider Errors", () => {
  it("ProviderError has statusCode and retryable flag", () => {
    const err = new ProviderError("fail", 500, true);
    expect(err.message).toBe("fail");
    expect(err.statusCode).toBe(500);
    expect(err.retryable).toBe(true);
    expect(err).toBeInstanceOf(Error);
  });

  it("RateLimitError is retryable with retryAfterMs", () => {
    const err = new RateLimitError("rate limited", 2000);
    expect(err.retryable).toBe(true);
    expect(err.statusCode).toBe(429);
    expect(err.retryAfterMs).toBe(2000);
  });

  it("NetworkError is always retryable", () => {
    const err = new NetworkError("ECONNRESET");
    expect(err.retryable).toBe(true);
  });

  it("AuthError is never retryable", () => {
    const err = new AuthError("invalid key");
    expect(err.retryable).toBe(false);
    expect(err.statusCode).toBe(401);
  });

  describe("classifyError", () => {
    it("classifies 429 as RateLimitError", () => {
      const raw = { status: 429, message: "Too many requests", headers: { get: (h: string) => h === "retry-after" ? "3" : null } };
      const err = classifyError(raw);
      expect(err).toBeInstanceOf(RateLimitError);
      expect((err as RateLimitError).retryAfterMs).toBe(3000);
    });

    it("classifies 401 as AuthError", () => {
      const err = classifyError({ status: 401, message: "Unauthorized" });
      expect(err).toBeInstanceOf(AuthError);
      expect(err.retryable).toBe(false);
    });

    it("classifies 500 as retryable ProviderError", () => {
      const err = classifyError({ status: 500, message: "Internal" });
      expect(err).toBeInstanceOf(ProviderError);
      expect(err.retryable).toBe(true);
    });

    it("classifies ECONNRESET as NetworkError", () => {
      const err = classifyError({ code: "ECONNRESET", message: "reset" });
      expect(err).toBeInstanceOf(NetworkError);
    });

    it("classifies 400 as non-retryable", () => {
      const err = classifyError({ status: 400, message: "Bad request" });
      expect(err.retryable).toBe(false);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/providers/errors.test.ts`
Expected: FAIL — module not found

**Step 3: Write the implementation**

Create `src/providers/errors.ts`:

```typescript
export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly retryable: boolean = false,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

export class RateLimitError extends ProviderError {
  public readonly retryAfterMs?: number;

  constructor(message: string, retryAfterMs?: number) {
    super(message, 429, true);
    this.name = "RateLimitError";
    this.retryAfterMs = retryAfterMs;
  }
}

export class NetworkError extends ProviderError {
  constructor(message: string) {
    super(message, undefined, true);
    this.name = "NetworkError";
  }
}

export class AuthError extends ProviderError {
  constructor(message: string) {
    super(message, 401, false);
    this.name = "AuthError";
  }
}

const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503]);
const NETWORK_ERROR_CODES = new Set(["ECONNRESET", "ETIMEDOUT", "ECONNREFUSED", "EPIPE", "UND_ERR_CONNECT_TIMEOUT"]);

export function classifyError(raw: any): ProviderError {
  const status = raw?.status ?? raw?.statusCode;
  const message = raw?.message ?? String(raw);
  const code = raw?.code;

  // Network errors
  if (code && NETWORK_ERROR_CODES.has(code)) {
    return new NetworkError(message);
  }
  if (message?.includes("fetch failed") || message?.includes("ECONNRESET")) {
    return new NetworkError(message);
  }

  // HTTP status errors
  if (status === 429) {
    const retryAfter = raw?.headers?.get?.("retry-after");
    const retryMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : undefined;
    return new RateLimitError(message, retryMs);
  }

  if (status === 401 || status === 403) {
    return new AuthError(message);
  }

  if (RETRYABLE_STATUS_CODES.has(status)) {
    return new ProviderError(message, status, true);
  }

  return new ProviderError(message, status, false);
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/providers/errors.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/providers/errors.ts tests/providers/errors.test.ts
git commit -m "feat(providers): add typed error classes with classification"
```

---

## Task 6: Retry with Exponential Backoff

**Files:**
- Create: `src/providers/retry.ts`
- Test: `tests/providers/retry.test.ts`

**Step 1: Write the failing tests**

Create `tests/providers/retry.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { withRetry, isRetryable, getRetryDelay } from "../../src/providers/retry.js";
import { ProviderError, RateLimitError, NetworkError, AuthError } from "../../src/providers/errors.js";

describe("isRetryable", () => {
  it("returns true for NetworkError", () => {
    expect(isRetryable(new NetworkError("timeout"))).toBe(true);
  });

  it("returns true for RateLimitError", () => {
    expect(isRetryable(new RateLimitError("429"))).toBe(true);
  });

  it("returns false for AuthError", () => {
    expect(isRetryable(new AuthError("401"))).toBe(false);
  });

  it("returns true for retryable ProviderError", () => {
    expect(isRetryable(new ProviderError("500", 500, true))).toBe(true);
  });

  it("returns false for non-retryable ProviderError", () => {
    expect(isRetryable(new ProviderError("400", 400, false))).toBe(false);
  });

  it("returns true for unknown errors (safe default)", () => {
    expect(isRetryable(new Error("random"))).toBe(true);
  });
});

describe("getRetryDelay", () => {
  it("doubles delay each attempt", () => {
    expect(getRetryDelay(0, 1000)).toBe(1000);
    expect(getRetryDelay(1, 1000)).toBe(2000);
    expect(getRetryDelay(2, 1000)).toBe(4000);
  });

  it("respects retryAfter if larger", () => {
    expect(getRetryDelay(0, 1000, 5000)).toBe(5000);
  });

  it("caps at maxDelay", () => {
    expect(getRetryDelay(10, 1000, undefined, 10000)).toBe(10000);
  });
});

describe("withRetry", () => {
  it("yields values from successful generator", async () => {
    async function* gen() {
      yield "a";
      yield "b";
    }

    const results: string[] = [];
    for await (const val of withRetry(() => gen(), { maxRetries: 3, baseDelayMs: 1, maxDelayMs: 10 })) {
      results.push(val);
    }
    expect(results).toEqual(["a", "b"]);
  });

  it("retries on retryable error and succeeds", async () => {
    let attempts = 0;
    async function* gen() {
      attempts++;
      if (attempts < 3) {
        throw new NetworkError("ECONNRESET");
      }
      yield "success";
    }

    const onRetry = vi.fn();
    const results: string[] = [];
    for await (const val of withRetry(() => gen(), { maxRetries: 3, baseDelayMs: 1, maxDelayMs: 10 }, onRetry)) {
      results.push(val);
    }

    expect(results).toEqual(["success"]);
    expect(onRetry).toHaveBeenCalledTimes(2);
    expect(attempts).toBe(3);
  });

  it("throws after exhausting retries", async () => {
    async function* gen(): AsyncGenerator<string> {
      throw new NetworkError("always fails");
    }

    const results: string[] = [];
    await expect(async () => {
      for await (const val of withRetry(() => gen(), { maxRetries: 2, baseDelayMs: 1, maxDelayMs: 10 })) {
        results.push(val);
      }
    }).rejects.toThrow("always fails");
  });

  it("does not retry non-retryable errors", async () => {
    let attempts = 0;
    async function* gen(): AsyncGenerator<string> {
      attempts++;
      throw new AuthError("invalid key");
    }

    await expect(async () => {
      for await (const _ of withRetry(() => gen(), { maxRetries: 3, baseDelayMs: 1, maxDelayMs: 10 })) {
        // consume
      }
    }).rejects.toThrow("invalid key");

    expect(attempts).toBe(1);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/providers/retry.test.ts`
Expected: FAIL — module not found

**Step 3: Write the implementation**

Create `src/providers/retry.ts`:

```typescript
import { ProviderError } from "./errors.js";

export interface RetryOptions {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

const DEFAULT_OPTIONS: RetryOptions = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
};

export function isRetryable(error: unknown): boolean {
  if (error instanceof ProviderError) {
    return error.retryable;
  }
  // Unknown errors default to retryable (transient issues)
  return true;
}

export function getRetryDelay(
  attempt: number,
  baseDelay: number,
  retryAfter?: number,
  maxDelay?: number,
): number {
  const exponential = baseDelay * Math.pow(2, attempt);
  const delay = retryAfter ? Math.max(exponential, retryAfter) : exponential;
  return maxDelay ? Math.min(delay, maxDelay) : delay;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function* withRetry<T>(
  fn: () => AsyncIterable<T>,
  options?: Partial<RetryOptions>,
  onRetry?: (attempt: number, delayMs: number, error: Error) => void,
): AsyncIterable<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      for await (const value of fn()) {
        yield value;
      }
      return; // Success — exit
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (!isRetryable(error) || attempt >= opts.maxRetries) {
        throw lastError;
      }

      const retryAfter =
        error instanceof ProviderError && "retryAfterMs" in error
          ? (error as any).retryAfterMs
          : undefined;

      const delay = getRetryDelay(attempt, opts.baseDelayMs, retryAfter, opts.maxDelayMs);
      onRetry?.(attempt + 1, delay, lastError);
      await sleep(delay);
    }
  }

  throw lastError;
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/providers/retry.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/providers/retry.ts tests/providers/retry.test.ts
git commit -m "feat(providers): add retry with exponential backoff"
```

---

## Task 7: Token Counting

**Files:**
- Create: `src/providers/tokens.ts`
- Test: `tests/providers/tokens.test.ts`

**Step 1: Write the failing tests**

Create `tests/providers/tokens.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { countTokens, countMessageTokens, estimateCost, MODEL_PRICING } from "../../src/providers/tokens.js";
import type { Message } from "../../src/providers/types.js";

describe("countTokens", () => {
  it("counts tokens for a simple string with OpenAI model", () => {
    const count = countTokens("Hello, world!", "gpt-4o");
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThan(10); // "Hello, world!" is ~4 tokens
  });

  it("falls back to char/4 estimate for unknown models", () => {
    const text = "a".repeat(400);
    const count = countTokens(text, "unknown-model");
    expect(count).toBe(100); // 400 / 4
  });

  it("handles empty string", () => {
    expect(countTokens("", "gpt-4o")).toBe(0);
  });
});

describe("countMessageTokens", () => {
  it("counts tokens across multiple messages", () => {
    const messages: Message[] = [
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi there! How can I help you today?" },
    ];
    const count = countMessageTokens(messages, "gpt-4o");
    expect(count).toBeGreaterThan(5);
    expect(count).toBeLessThan(50);
  });

  it("includes overhead per message", () => {
    const single: Message[] = [{ role: "user", content: "Hi" }];
    const double: Message[] = [
      { role: "user", content: "Hi" },
      { role: "assistant", content: "" },
    ];
    // Each message adds ~4 tokens overhead
    expect(countMessageTokens(double, "gpt-4o")).toBeGreaterThan(
      countMessageTokens(single, "gpt-4o"),
    );
  });
});

describe("estimateCost", () => {
  it("calculates cost for gpt-4o", () => {
    // 1000 input + 500 output at $2.50/$10.00 per 1M
    const cost = estimateCost(1000, 500, "gpt-4o");
    expect(cost).toBeCloseTo(0.0025 + 0.005, 4); // $0.0075
  });

  it("returns 0 for unknown models", () => {
    expect(estimateCost(1000, 500, "unknown")).toBe(0);
  });
});

describe("MODEL_PRICING", () => {
  it("has pricing for main models", () => {
    expect(MODEL_PRICING["gpt-4o"]).toBeDefined();
    expect(MODEL_PRICING["gpt-4o-mini"]).toBeDefined();
    expect(MODEL_PRICING["gemini-2.0-flash"]).toBeDefined();
    expect(MODEL_PRICING["grok-2"]).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/providers/tokens.test.ts`
Expected: FAIL — module not found

**Step 3: Write the implementation**

Create `src/providers/tokens.ts`:

```typescript
import { encodingForModel } from "js-tiktoken";
import type { Message } from "./types.js";

// Prices per 1M tokens (USD)
export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "gpt-4o": { input: 2.5, output: 10 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4-turbo": { input: 10, output: 30 },
  "gpt-3.5-turbo": { input: 0.5, output: 1.5 },
  "gemini-2.0-flash": { input: 0.1, output: 0.4 },
  "gemini-1.5-pro": { input: 1.25, output: 5 },
  "gemini-1.5-flash": { input: 0.075, output: 0.3 },
  "grok-2": { input: 2, output: 10 },
  "grok-2-mini": { input: 0.3, output: 0.5 },
};

// Models that use the cl100k_base encoding (OpenAI family)
const TIKTOKEN_MODELS = new Set([
  "gpt-4o",
  "gpt-4o-mini",
  "gpt-4-turbo",
  "gpt-3.5-turbo",
]);

let encoder: ReturnType<typeof encodingForModel> | null = null;

function getEncoder() {
  if (!encoder) {
    encoder = encodingForModel("gpt-4o" as any);
  }
  return encoder;
}

export function countTokens(text: string, model: string): number {
  if (!text) return 0;

  if (TIKTOKEN_MODELS.has(model)) {
    return getEncoder().encode(text).length;
  }

  // Fallback: character count / 4
  return Math.ceil(text.length / 4);
}

const MESSAGE_OVERHEAD = 4; // ~4 tokens per message for role + formatting

export function countMessageTokens(messages: Message[], model: string): number {
  let total = 0;
  for (const msg of messages) {
    total += countTokens(msg.content, model) + MESSAGE_OVERHEAD;
  }
  return total;
}

export function estimateCost(
  inputTokens: number,
  outputTokens: number,
  model: string,
): number {
  const pricing = MODEL_PRICING[model];
  if (!pricing) return 0;

  return (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/providers/tokens.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/providers/tokens.ts tests/providers/tokens.test.ts
git commit -m "feat(tokens): add token counting with js-tiktoken and cost estimation"
```

---

## Task 8: Session Usage Tracker

**Files:**
- Create: `src/providers/usage.ts`
- Test: `tests/providers/usage.test.ts`

**Step 1: Write the failing tests**

Create `tests/providers/usage.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { UsageTracker } from "../../src/providers/usage.js";

describe("UsageTracker", () => {
  it("starts with zero stats", () => {
    const tracker = new UsageTracker();
    const stats = tracker.getStats();
    expect(stats.inputTokens).toBe(0);
    expect(stats.outputTokens).toBe(0);
    expect(stats.totalTokens).toBe(0);
    expect(stats.estimatedCost).toBe(0);
    expect(stats.requestCount).toBe(0);
  });

  it("accumulates token usage", () => {
    const tracker = new UsageTracker();
    tracker.track(100, 50, "gpt-4o");
    tracker.track(200, 100, "gpt-4o");

    const stats = tracker.getStats();
    expect(stats.inputTokens).toBe(300);
    expect(stats.outputTokens).toBe(150);
    expect(stats.totalTokens).toBe(450);
    expect(stats.requestCount).toBe(2);
  });

  it("tracks cost across requests", () => {
    const tracker = new UsageTracker();
    tracker.track(1000, 500, "gpt-4o");
    const stats = tracker.getStats();
    // 1000 * 2.5/1M + 500 * 10/1M = 0.0025 + 0.005 = 0.0075
    expect(stats.estimatedCost).toBeCloseTo(0.0075, 4);
  });

  it("reset clears all stats", () => {
    const tracker = new UsageTracker();
    tracker.track(1000, 500, "gpt-4o");
    tracker.reset();
    const stats = tracker.getStats();
    expect(stats.totalTokens).toBe(0);
    expect(stats.requestCount).toBe(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/providers/usage.test.ts`
Expected: FAIL — module not found

**Step 3: Write the implementation**

Create `src/providers/usage.ts`:

```typescript
import { estimateCost } from "./tokens.js";

export interface UsageStats {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
  requestCount: number;
}

export class UsageTracker {
  private inputTokens = 0;
  private outputTokens = 0;
  private cost = 0;
  private requests = 0;

  track(inputTokens: number, outputTokens: number, model: string): void {
    this.inputTokens += inputTokens;
    this.outputTokens += outputTokens;
    this.cost += estimateCost(inputTokens, outputTokens, model);
    this.requests++;
  }

  getStats(): UsageStats {
    return {
      inputTokens: this.inputTokens,
      outputTokens: this.outputTokens,
      totalTokens: this.inputTokens + this.outputTokens,
      estimatedCost: this.cost,
      requestCount: this.requests,
    };
  }

  reset(): void {
    this.inputTokens = 0;
    this.outputTokens = 0;
    this.cost = 0;
    this.requests = 0;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/providers/usage.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/providers/usage.ts tests/providers/usage.test.ts
git commit -m "feat(tokens): add session usage tracker with cost accumulation"
```

---

## Task 9: Integrate Retries into Chat Loop

**Files:**
- Modify: `src/cli/chat.ts` (the `chatWithTools` function, lines 166-224)

**Step 1: Add imports**

At the top of `src/cli/chat.ts`, add:

```typescript
import { withRetry } from "../providers/retry.js";
import { classifyError } from "../providers/errors.js";
import { getLogger } from "../logging/logger.js";
```

**Step 2: Wrap provider.chat() with retry in chatWithTools**

Replace the try/catch block in `chatWithTools` (lines 177-194):

```typescript
// BEFORE (current):
try {
  for await (const chunk of state.provider.chat(state.messages, {
    temperature: 0.7,
    systemPrompt: await getSystemPrompt(),
    tools: TOOL_DEFINITIONS,
  })) {
    streamWrite(chunk.content);
    fullResponse += chunk.content;
    if (chunk.toolCalls) {
      toolCalls = chunk.toolCalls;
    }
  }
} catch (error) {
  const errorMsg = error instanceof Error ? error.message : "Unknown error";
  console.log(chalk.red(`\nError: ${errorMsg}`));
  state.messages.pop();
  return;
}
```

Replace with:

```typescript
const systemPrompt = await getSystemPrompt();

try {
  const stream = withRetry(
    () =>
      state.provider.chat(state.messages, {
        temperature: 0.7,
        systemPrompt,
        tools: TOOL_DEFINITIONS,
      }),
    { maxRetries: 3, baseDelayMs: 1000, maxDelayMs: 10000 },
    (attempt, delayMs, error) => {
      console.log(
        chalk.dim(`\nRetrying in ${delayMs / 1000}s... (attempt ${attempt}/3)`),
      );
      getLogger().warn({ attempt, delayMs, error: error.message }, "api_retry");
    },
  );

  for await (const chunk of stream) {
    streamWrite(chunk.content);
    fullResponse += chunk.content;
    if (chunk.toolCalls) {
      toolCalls = chunk.toolCalls;
    }
  }
} catch (error) {
  const classified = classifyError(error);
  const errorMsg = classified.message;
  getLogger().error({ error: errorMsg, retryable: classified.retryable }, "api_error");

  if (classified.retryable) {
    console.log(
      chalk.red(`\nError: Provider unavailable after 3 attempts. Your message is preserved — try again or /provider to switch.`),
    );
  } else {
    console.log(chalk.red(`\nError: ${errorMsg}`));
    state.messages.pop();
  }
  return;
}
```

**Step 3: Verify build**

Run: `npx tsc --noEmit 2>&1 | grep -v marked-terminal`
Expected: No new errors

**Step 4: Commit**

```bash
git add src/cli/chat.ts
git commit -m "feat(chat): integrate retry with backoff into chat loop"
```

---

## Task 10: Integrate Token Counting & Usage into Chat Loop

**Files:**
- Modify: `src/cli/commands.ts` (add UsageTracker to ChatState)
- Modify: `src/cli/chat.ts` (add token counting, warnings, usage tracking)

**Step 1: Add UsageTracker to ChatState**

In `src/cli/commands.ts`, add import:

```typescript
import { UsageTracker } from "../providers/usage.js";
```

Update the `ChatState` interface:

```typescript
export interface ChatState {
  provider: Provider;
  model: string;
  messages: Message[];
  usage: UsageTracker;
}
```

**Step 2: Initialize UsageTracker in chat.ts**

In `src/cli/chat.ts`, add imports:

```typescript
import { countMessageTokens, countTokens } from "../providers/tokens.js";
import { UsageTracker } from "../providers/usage.js";
```

In `startChat`, update the state initialization (around line 67):

```typescript
let state: ChatState = {
  provider,
  model,
  messages: [],
  usage: new UsageTracker(),
};
```

**Step 3: Add token counting and context window warning to chatWithTools**

In `chatWithTools`, before the retry call, add:

```typescript
// Count input tokens and warn if approaching limit
const models = state.provider.listModels();
const modelInfo = models.find((m) => m.id === state.model);
const contextWindow = modelInfo?.contextWindow ?? 128000;
const inputTokens = countMessageTokens(state.messages, state.model);
const usagePercent = Math.round((inputTokens / contextWindow) * 100);

if (usagePercent > 80) {
  console.log(
    chalk.yellow(
      `\n⚠ ${usagePercent}% of context window used (${(inputTokens / 1000).toFixed(1)}K/${(contextWindow / 1000).toFixed(0)}K). Consider /compress or /clear.`,
    ),
  );
}

getLogger().debug({ inputTokens, contextWindow, usagePercent }, "token_budget");
```

After the successful stream completes (after the for-await loop, before checking toolCalls), add:

```typescript
const outputTokens = countTokens(fullResponse, state.model);
state.usage.track(inputTokens, outputTokens, state.model);
getLogger().debug({ inputTokens, outputTokens }, "token_usage");
```

**Step 4: Verify build**

Run: `npx tsc --noEmit 2>&1 | grep -v marked-terminal`
Expected: No new errors

**Step 5: Commit**

```bash
git add src/cli/chat.ts src/cli/commands.ts
git commit -m "feat(chat): add token counting, context window warnings, and usage tracking"
```

---

## Task 11: Enhance /stats with Accurate Token & Cost Data

**Files:**
- Modify: `src/cli/stats.ts`
- Modify: `src/cli/commands.ts` (update /stats handler)

**Step 1: Update stats.ts**

Replace the content of `src/cli/stats.ts` with:

```typescript
import type { Message } from "../providers/types.js";
import type { UsageStats } from "../providers/usage.js";

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

  const estimatedTokens = Math.ceil(totalContent.length / 4);

  return {
    messageCount: messages.length,
    userMessages,
    assistantMessages,
    toolCalls,
    estimatedTokens,
  };
}

export function formatStats(stats: SessionStats, usage?: UsageStats, contextWindow?: number): string {
  const lines = [
    `Messages: ${stats.messageCount} (${stats.userMessages} user, ${stats.assistantMessages} assistant)`,
    `Tool calls: ${stats.toolCalls}`,
  ];

  if (usage && usage.requestCount > 0) {
    lines.push(
      `Tokens: ${usage.inputTokens.toLocaleString()} in / ${usage.outputTokens.toLocaleString()} out (${usage.totalTokens.toLocaleString()} total)`,
    );
    if (usage.estimatedCost > 0) {
      lines.push(`Cost: ~$${usage.estimatedCost.toFixed(4)}`);
    }
    if (contextWindow) {
      const pct = Math.round((usage.totalTokens / contextWindow) * 100);
      lines.push(`Context: ${pct}% of ${(contextWindow / 1000).toFixed(0)}K window`);
    }
  } else {
    lines.push(`Estimated tokens: ${stats.estimatedTokens.toLocaleString()}`);
  }

  return lines.join("\n");
}
```

**Step 2: Update /stats handler in commands.ts**

Find the `case "stats"` handler and replace it:

```typescript
case "stats": {
  if (state.messages.length === 0) {
    console.log(chalk.dim("No messages in current session."));
    return { action: "continue", state };
  }

  const stats = calculateStats(state.messages);
  const models = state.provider.listModels();
  const modelInfo = models.find((m) => m.id === state.model);

  console.log(chalk.bold("\nSession Statistics:"));
  console.log(formatStats(stats, state.usage.getStats(), modelInfo?.contextWindow));
  return { action: "continue", state };
}
```

**Step 3: Verify build**

Run: `npx tsc --noEmit 2>&1 | grep -v marked-terminal`
Expected: No new errors

**Step 4: Commit**

```bash
git add src/cli/stats.ts src/cli/commands.ts
git commit -m "feat(stats): show accurate tokens, cost, and context window usage"
```

---

## Task 12: Add Logging to Tool Execution and MCP

**Files:**
- Modify: `src/tools/executor.ts`
- Modify: `src/mcp/client.ts`

**Step 1: Add tracing to tool executor**

In `src/tools/executor.ts`, add import:

```typescript
import { traceToolExecution } from "../logging/trace.js";
```

In the `executeTool` function, wrap the `runTool` call to measure timing:

```typescript
// Replace the try block (lines 70-79):
try {
  const start = Date.now();
  const result = await runTool(name, args);
  const durationMs = Date.now() - start;
  traceToolExecution(name, args, durationMs, result.length);
  console.log(chalk.green("[Done]"));
  console.log(result);
  return { id, result };
} catch (error: any) {
  const errMsg = error.message || "Unknown error";
  traceToolExecution(name, args, 0, 0);
  console.log(chalk.red("[Error]"), errMsg);
  return { id, result: `Error: ${errMsg}`, isError: true };
}
```

**Step 2: Add logging to MCP client**

In `src/mcp/client.ts`, add import:

```typescript
import { getLogger } from "../logging/logger.js";
```

Add logging calls to `connect()`, `discoverTools()`, and `executeTool()` methods — one `getLogger().info(...)` or `getLogger().debug(...)` call at the start and end of each method. The exact placement depends on the current method structure — add at the entry and return points.

**Step 3: Verify build**

Run: `npx tsc --noEmit 2>&1 | grep -v marked-terminal`
Expected: No new errors

**Step 4: Commit**

```bash
git add src/tools/executor.ts src/mcp/client.ts
git commit -m "feat(logging): add tracing to tool execution and MCP client"
```

---

## Task 13: Run Full Test Suite and Fix Issues

**Step 1: Run all tests**

Run: `npx vitest run`
Expected: All tests pass

**Step 2: Fix any failures**

If tests fail due to the `ChatState` change (added `usage` field), update any test that constructs a `ChatState` to include `usage: new UsageTracker()`.

**Step 3: Run type check**

Run: `npx tsc --noEmit 2>&1 | grep -v marked-terminal`
Expected: No new errors

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve test failures from Phase 4 integration"
```

---

## Task 14: Update Roadmap

**Files:**
- Modify: `docs/plans/feature-roadmap.md`

**Step 1: Add Phase 4 section to roadmap**

After Phase 3, add:

```markdown
## Phase 4: Production Hardening

### 4.1 Structured Logging & Debugging
**Status:** Done
- pino-based structured logger with silent/info/debug levels
- --verbose and --debug CLI flags
- API request/response tracing (provider, tokens, latency)
- Tool execution tracing (name, args, duration, result size)

### 4.2 Error Recovery & Retries
**Status:** Done
- Typed error classes (ProviderError, RateLimitError, NetworkError, AuthError)
- Exponential backoff retry (3 attempts, 1s/2s/4s)
- Respects Retry-After headers from rate limits
- User feedback during retries, preserves message on failure

### 4.3 Token Counting & Cost Tracking
**Status:** Done
- js-tiktoken for accurate OpenAI token counting
- Character/4 fallback for non-OpenAI models
- Per-session cost tracking with model pricing table
- Context window usage warnings at >80%
- Enhanced /stats with tokens, cost, and context window %
```

Update the implementation log table.

**Step 2: Commit**

```bash
git add docs/plans/feature-roadmap.md
git commit -m "docs: update roadmap with Phase 4 completion"
```
