// tests/cli/commands.test.ts
import { describe, it, expect } from "vitest";
import {
  parseCommand,
  isCommand,
  resolveCommand,
} from "../../src/cli/commands.js";

describe("Commands", () => {
  it("detects command input", () => {
    expect(isCommand("/help")).toBe(true);
    expect(isCommand("/models")).toBe(true);
    expect(isCommand("hello")).toBe(false);
  });

  it("parses command name", () => {
    expect(parseCommand("/help").name).toBe("help");
    expect(parseCommand("/file src/index.ts").name).toBe("file");
  });

  it("parses command args", () => {
    expect(parseCommand("/file src/index.ts").args).toBe("src/index.ts");
    expect(parseCommand("/help").args).toBe("");
  });

  describe("partial command matching", () => {
    it("resolves exact command name", () => {
      expect(resolveCommand("models")).toBe("models");
      expect(resolveCommand("help")).toBe("help");
    });

    it("resolves partial command name to full command", () => {
      expect(resolveCommand("mod")).toBe("models");
      expect(resolveCommand("m")).toBe("models");
    });

    it('resolves "h" to help', () => {
      expect(resolveCommand("h")).toBe("help");
    });

    it('resolves "p" to provider', () => {
      expect(resolveCommand("p")).toBe("provider");
    });

    it("resolves ambiguous partials to first match", () => {
      expect(resolveCommand("c")).toBe("clear");
      expect(resolveCommand("s")).toBe("stats");
    });

    it("returns null for unknown commands", () => {
      expect(resolveCommand("xyz")).toBeNull();
      expect(resolveCommand("unknown")).toBeNull();
    });

    it('resolves "q" to quit', () => {
      expect(resolveCommand("q")).toBe("quit");
    });

    it("resolves unique partial prefixes", () => {
      expect(resolveCommand("sta")).toBe("stats");
      expect(resolveCommand("sty")).toBe("styles");
      expect(resolveCommand("mem")).toBe("memory");
      expect(resolveCommand("mc")).toBe("mcp");
    });
  });
});
