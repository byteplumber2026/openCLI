import { describe, it, expect, beforeEach } from "vitest";
import {
  createLogger,
  getLogger,
  setLogLevel,
} from "../../src/logging/logger.js";

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
