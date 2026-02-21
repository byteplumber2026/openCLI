// tests/integration/phase4-retry.test.ts
import { describe, it, expect, vi } from "vitest";
import {
  withRetry,
  isRetryable,
  getRetryDelay,
} from "../../src/providers/retry.js";
import {
  classifyError,
  ProviderError,
  RateLimitError,
  NetworkError,
  AuthError,
} from "../../src/providers/errors.js";

describe("Phase 4: Retry & Error Handling Integration", () => {
  describe("Error classification", () => {
    it("classifies rate limit errors correctly", () => {
      const err = classifyError({ status: 429, message: "Rate limited" });
      expect(err).toBeInstanceOf(RateLimitError);
      expect(err.retryable).toBe(true);
    });

    it("classifies auth errors correctly", () => {
      const err = classifyError({ status: 401, message: "Unauthorized" });
      expect(err).toBeInstanceOf(AuthError);
      expect(err.retryable).toBe(false);
    });

    it("classifies server errors as retryable", () => {
      const err500 = classifyError({ status: 500, message: "Internal error" });
      expect(err500).toBeInstanceOf(ProviderError);
      expect(err500.retryable).toBe(true);

      const err502 = classifyError({ status: 502, message: "Bad gateway" });
      expect(err502.retryable).toBe(true);
    });

    it("classifies network errors correctly", () => {
      const err = classifyError({
        code: "ECONNRESET",
        message: "Connection reset",
      });
      expect(err).toBeInstanceOf(NetworkError);
      expect(err.retryable).toBe(true);
    });

    it("classifies client errors as non-retryable", () => {
      const err = classifyError({ status: 400, message: "Bad request" });
      expect(err.retryable).toBe(false);
    });
  });

  describe("Retry logic integration", () => {
    it("isRetryable correctly identifies retryable errors", () => {
      expect(isRetryable(new NetworkError("timeout"))).toBe(true);
      expect(isRetryable(new RateLimitError("rate limited"))).toBe(true);
      expect(isRetryable(new ProviderError("500", 500, true))).toBe(true);
      expect(isRetryable(new AuthError("unauthorized"))).toBe(false);
      expect(isRetryable(new ProviderError("400", 400, false))).toBe(false);
      expect(isRetryable(new Error("unknown"))).toBe(true);
    });

    it("getRetryDelay implements exponential backoff", () => {
      expect(getRetryDelay(0, 1000)).toBe(1000);
      expect(getRetryDelay(1, 1000)).toBe(2000);
      expect(getRetryDelay(2, 1000)).toBe(4000);
    });

    it("getRetryDelay respects retryAfter header when larger", () => {
      expect(getRetryDelay(0, 1000, 5000)).toBe(5000);
      expect(getRetryDelay(0, 1000, 500)).toBe(1000);
    });

    it("getRetryDelay caps at maxDelay", () => {
      expect(getRetryDelay(10, 1000, undefined, 10000)).toBe(10000);
    });

    it("withRetry succeeds on first try", async () => {
      async function* successGen() {
        yield "result1";
        yield "result2";
      }

      const results: string[] = [];
      for await (const val of withRetry(() => successGen(), {
        maxRetries: 3,
        baseDelayMs: 1,
        maxDelayMs: 10,
      })) {
        results.push(val);
      }

      expect(results).toEqual(["result1", "result2"]);
    });

    it("withRetry retries on retryable error and succeeds", async () => {
      let attempts = 0;
      async function* flakyGen() {
        attempts++;
        if (attempts < 3) {
          throw new NetworkError("temporary failure");
        }
        yield "success after retry";
      }

      const onRetry = vi.fn();
      const results: string[] = [];
      for await (const val of withRetry(
        () => flakyGen(),
        { maxRetries: 3, baseDelayMs: 1, maxDelayMs: 10 },
        onRetry,
      )) {
        results.push(val);
      }

      expect(results).toEqual(["success after retry"]);
      expect(onRetry).toHaveBeenCalledTimes(2);
      expect(attempts).toBe(3);
    });

    it("withRetry throws after exhausting retries", async () => {
      async function* alwaysFailGen(): AsyncGenerator<string> {
        throw new NetworkError("persistent failure");
      }

      await expect(async () => {
        for await (const _ of withRetry(() => alwaysFailGen(), {
          maxRetries: 2,
          baseDelayMs: 1,
          maxDelayMs: 10,
        })) {
          // consume
        }
      }).rejects.toThrow("persistent failure");
    });

    it("withRetry does not retry non-retryable errors", async () => {
      let attempts = 0;
      async function* authFailGen(): AsyncGenerator<string> {
        attempts++;
        throw new AuthError("invalid key");
      }

      await expect(async () => {
        for await (const _ of withRetry(() => authFailGen(), {
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
});
