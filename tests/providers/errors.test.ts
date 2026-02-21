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
      const raw = {
        status: 429,
        message: "Too many requests",
        headers: { get: (h: string) => (h === "retry-after" ? "3" : null) },
      };
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
