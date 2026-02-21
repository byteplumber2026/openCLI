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
