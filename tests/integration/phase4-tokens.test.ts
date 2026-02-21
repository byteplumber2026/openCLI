// tests/integration/phase4-tokens.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import {
  countTokens,
  countMessageTokens,
  estimateCost,
  MODEL_PRICING,
} from "../../src/providers/tokens.js";
import { UsageTracker } from "../../src/providers/usage.js";
import type { Message } from "../../src/providers/types.js";

describe("Phase 4: Token Counting & Usage Tracking Integration", () => {
  describe("Token counting", () => {
    it("counts tokens for OpenAI models accurately", () => {
      const count = countTokens("Hello, world!", "gpt-4o");
      expect(count).toBeGreaterThan(0);
      expect(count).toBeLessThan(10);
    });

    it("falls back to char/4 for unknown models", () => {
      const text = "a".repeat(400);
      const count = countTokens(text, "unknown-model");
      expect(count).toBe(100);
    });

    it("handles empty string", () => {
      expect(countTokens("", "gpt-4o")).toBe(0);
    });
  });

  describe("Message token counting", () => {
    it("counts tokens across multiple messages with overhead", () => {
      const messages: Message[] = [
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi there! How can I help you today?" },
      ];
      const count = countMessageTokens(messages, "gpt-4o");
      expect(count).toBeGreaterThan(5);
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

  describe("Cost estimation", () => {
    it("calculates cost for gpt-4o correctly", () => {
      const cost = estimateCost(1000, 500, "gpt-4o");
      expect(cost).toBeCloseTo(0.0075, 4);
    });

    it("calculates cost for other models", () => {
      const cost = estimateCost(1000, 500, "gpt-4o-mini");
      expect(cost).toBeCloseTo(0.00045, 5);
    });

    it("returns 0 for unknown models", () => {
      expect(estimateCost(1000, 500, "unknown")).toBe(0);
    });
  });

  describe("MODEL_PRICING", () => {
    it("has pricing for all major models", () => {
      expect(MODEL_PRICING["gpt-4o"]).toBeDefined();
      expect(MODEL_PRICING["gpt-4o-mini"]).toBeDefined();
      expect(MODEL_PRICING["gemini-2.0-flash"]).toBeDefined();
      expect(MODEL_PRICING["grok-2"]).toBeDefined();
    });
  });

  describe("UsageTracker integration", () => {
    let tracker: UsageTracker;

    beforeEach(() => {
      tracker = new UsageTracker();
    });

    it("starts with zero stats", () => {
      const stats = tracker.getStats();
      expect(stats.inputTokens).toBe(0);
      expect(stats.outputTokens).toBe(0);
      expect(stats.totalTokens).toBe(0);
      expect(stats.estimatedCost).toBe(0);
      expect(stats.requestCount).toBe(0);
    });

    it("accumulates token usage across requests", () => {
      tracker.track(100, 50, "gpt-4o");
      tracker.track(200, 100, "gpt-4o");

      const stats = tracker.getStats();
      expect(stats.inputTokens).toBe(300);
      expect(stats.outputTokens).toBe(150);
      expect(stats.totalTokens).toBe(450);
      expect(stats.requestCount).toBe(2);
    });

    it("tracks cost across requests", () => {
      tracker.track(1000, 500, "gpt-4o");
      const stats = tracker.getStats();
      expect(stats.estimatedCost).toBeCloseTo(0.0075, 4);
    });

    it("reset clears all stats", () => {
      tracker.track(1000, 500, "gpt-4o");
      tracker.reset();
      const stats = tracker.getStats();
      expect(stats.totalTokens).toBe(0);
      expect(stats.requestCount).toBe(0);
    });
  });
});
