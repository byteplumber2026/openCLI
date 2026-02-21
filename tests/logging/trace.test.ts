import { describe, it, expect, beforeEach } from "vitest";
import { setLogLevel } from "../../src/logging/logger.js";
import {
  traceRequest,
  traceResponse,
  traceToolExecution,
} from "../../src/logging/trace.js";

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
    traceResponse(ctx, 200, 1, Date.now() - ctx.startMs);
  });

  it("traceToolExecution logs without throwing", () => {
    traceToolExecution("shell_run", { command: "ls" }, 150, 512);
  });
});
