import { describe, it, expect } from "vitest";
import {
  executeCustomCommand,
  formatCustomCommandPrompt,
} from "../../src/commands/executor.js";
import type { CustomCommand } from "../../src/commands/types.js";

describe("Custom Command Executor", () => {
  const createCommand = (prompt: string): CustomCommand => ({
    name: "test",
    description: "Test command",
    prompt,
    source: "/test.toml",
  });

  describe("executeCustomCommand", () => {
    it("replaces {{args}} placeholder with arguments", async () => {
      const cmd = createCommand("Review this: {{args}}");
      const result = await executeCustomCommand(cmd, "src/index.ts");
      expect(result).toBe("Review this: src/index.ts");
    });

    it("replaces multiple {{args}} placeholders", async () => {
      const cmd = createCommand("First: {{args}}, Second: {{args}}");
      const result = await executeCustomCommand(cmd, "value");
      expect(result).toBe("First: value, Second: value");
    });

    it("returns prompt unchanged if no placeholder", async () => {
      const cmd = createCommand("Static prompt");
      const result = await executeCustomCommand(cmd, "ignored");
      expect(result).toBe("Static prompt");
    });

    it("handles empty arguments", async () => {
      const cmd = createCommand("Review: {{args}}");
      const result = await executeCustomCommand(cmd, "");
      expect(result).toBe("Review: ");
    });
  });

  describe("formatCustomCommandPrompt", () => {
    it("replaces {{args}} placeholder", () => {
      const cmd = createCommand("Test {{args}}");
      const result = formatCustomCommandPrompt(cmd, "input");
      expect(result).toBe("Test input");
    });
  });
});
