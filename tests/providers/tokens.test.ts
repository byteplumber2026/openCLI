import { describe, it, expect } from "vitest";
import {
  countTokens,
  countMessageTokens,
  estimateCost,
  MODEL_PRICING,
} from "../../src/providers/tokens.js";
import type { Message } from "../../src/providers/types.js";

describe("countTokens", () => {
  it("counts tokens for a simple string with OpenAI model", () => {
    const count = countTokens("Hello, world!", "gpt-4o");
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThan(10);
  });

  it("falls back to char/4 estimate for unknown models", () => {
    const text = "a".repeat(400);
    const count = countTokens(text, "unknown-model");
    expect(count).toBe(100);
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
    expect(countMessageTokens(double, "gpt-4o")).toBeGreaterThan(
      countMessageTokens(single, "gpt-4o"),
    );
  });
});

describe("estimateCost", () => {
  it("calculates cost for gpt-4o", () => {
    const cost = estimateCost(1000, 500, "gpt-4o");
    expect(cost).toBeCloseTo(0.0025 + 0.005, 4);
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
