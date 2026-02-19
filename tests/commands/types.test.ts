import { describe, it, expect } from "vitest";
import type {
  CustomCommand,
  CustomCommandDefinition,
} from "../../src/commands/types.js";

describe("CustomCommand Types", () => {
  it("CustomCommand interface has required fields", () => {
    const cmd: CustomCommand = {
      name: "review",
      description: "Review code",
      prompt: "Review this code: {{args}}",
      source: "/path/to/file.toml",
    };
    expect(cmd.name).toBe("review");
    expect(cmd.description).toBe("Review code");
    expect(cmd.prompt).toBe("Review this code: {{args}}");
    expect(cmd.source).toBe("/path/to/file.toml");
  });

  it("CustomCommandDefinition interface has required fields", () => {
    const def: CustomCommandDefinition = {
      name: "test",
      description: "A test command",
      prompt: "Test prompt",
    };
    expect(def.name).toBe("test");
    expect(def.description).toBe("A test command");
    expect(def.prompt).toBe("Test prompt");
  });
});
