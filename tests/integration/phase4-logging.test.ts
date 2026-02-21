// tests/integration/phase4-logging.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createLogger,
  getLogger,
  setLogLevel,
} from "../../src/logging/logger.js";
import {
  traceRequest,
  traceResponse,
  traceToolExecution,
} from "../../src/logging/trace.js";

describe("Phase 4: Logging Integration", () => {
  beforeEach(() => {
    setLogLevel("silent");
  });

  it("logger can be created at different levels", () => {
    const silent = createLogger("silent");
    expect(silent.level).toBe("silent");

    const info = createLogger("info");
    expect(info.level).toBe("info");

    const debug = createLogger("debug");
    expect(debug.level).toBe("debug");

    setLogLevel("silent");
  });

  it("trace functions work without throwing at silent level", () => {
    const ctx = traceRequest("openai", "gpt-4o", 5, 1000);
    expect(ctx.provider).toBe("openai");
    expect(ctx.model).toBe("gpt-4o");
    expect(ctx.startMs).toBeGreaterThan(0);

    traceResponse(ctx, 200, 1, 150);
    traceToolExecution("shell_run", { command: "ls" }, 50, 256);
  });

  it("logger singleton works across modules", () => {
    const logger1 = getLogger();
    const logger2 = getLogger();
    expect(logger1).toBe(logger2);

    setLogLevel("debug");
    expect(getLogger().level).toBe("debug");

    setLogLevel("silent");
  });
});
