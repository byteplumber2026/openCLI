import { describe, it, expect, vi } from "vitest";
import {
  withRetry,
  isRetryable,
  getRetryDelay,
} from "../../src/providers/retry.js";
import {
  ProviderError,
  RateLimitError,
  NetworkError,
  AuthError,
} from "../../src/providers/errors.js";

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
    for await (const val of withRetry(() => gen(), {
      maxRetries: 3,
      baseDelayMs: 1,
      maxDelayMs: 10,
    })) {
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
    for await (const val of withRetry(
      () => gen(),
      { maxRetries: 3, baseDelayMs: 1, maxDelayMs: 10 },
      onRetry,
    )) {
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
      for await (const val of withRetry(() => gen(), {
        maxRetries: 2,
        baseDelayMs: 1,
        maxDelayMs: 10,
      })) {
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
      for await (const _ of withRetry(() => gen(), {
        maxRetries: 3,
        baseDelayMs: 1,
        maxDelayMs: 10,
      })) {
        // consume
      }
    }).rejects.toThrow("invalid key");

    expect(attempts).toBe(1);
  });
});
