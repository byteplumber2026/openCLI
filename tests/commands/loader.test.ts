import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  parseToml,
  isValidDefinition,
  loadCommands,
  COMMANDS_DIR,
} from "../../src/commands/loader.js";
import { mkdir, writeFile, rm } from "fs/promises";
import { join } from "path";
import { homedir } from "os";

describe("Custom Command Loader", () => {
  describe("parseToml", () => {
    it("parses simple single-line values", () => {
      const content = `name = "review"
description = "Review code"
prompt = "Review this"`;
      const result = parseToml(content);
      expect(result.name).toBe("review");
      expect(result.description).toBe("Review code");
      expect(result.prompt).toBe("Review this");
    });

    it("parses multi-line string values", () => {
      const content = `name = "test"
description = "A test"
prompt = """
Review the following code:
{{args}}
"""`;
      const result = parseToml(content);
      expect(result.name).toBe("test");
      expect(result.description).toBe("A test");
      expect(result.prompt).toBe("Review the following code:\n{{args}}");
    });

    it("ignores comments", () => {
      const content = `# This is a comment
name = "test"
# Another comment
description = "Test"`;
      const result = parseToml(content);
      expect(result.name).toBe("test");
      expect(result.description).toBe("Test");
    });

    it("ignores empty lines", () => {
      const content = `name = "test"

description = "Test"

prompt = "Test"`;
      const result = parseToml(content);
      expect(result.name).toBe("test");
      expect(result.description).toBe("Test");
      expect(result.prompt).toBe("Test");
    });

    it("handles inline multiline start", () => {
      const content = `name = "test"
description = "Test"
prompt = """Line1
Line2
"""`;
      const result = parseToml(content);
      expect(result.prompt).toBe("Line1\nLine2");
    });

    it("handles single-line multiline value", () => {
      const content = `name = "test"
prompt = """single line"""
description = "Test"`;
      const result = parseToml(content);
      expect(result.prompt).toBe("single line");
    });
  });

  describe("isValidDefinition", () => {
    it("returns true for valid definition", () => {
      const def = { name: "test", description: "Test", prompt: "Test" };
      expect(isValidDefinition(def)).toBe(true);
    });

    it("returns false if name missing", () => {
      const def = { description: "Test", prompt: "Test" };
      expect(isValidDefinition(def)).toBe(false);
    });

    it("returns false if description missing", () => {
      const def = { name: "test", prompt: "Test" };
      expect(isValidDefinition(def)).toBe(false);
    });

    it("returns false if prompt missing", () => {
      const def = { name: "test", description: "Test" };
      expect(isValidDefinition(def)).toBe(false);
    });

    it("returns false for empty strings", () => {
      const def = { name: "", description: "Test", prompt: "Test" };
      expect(isValidDefinition(def)).toBe(false);
    });
  });

  describe("loadCommands", () => {
    const testDir = join(homedir(), ".open-cli", "commands-test-" + Date.now());

    beforeEach(async () => {
      await mkdir(testDir, { recursive: true });
    });

    afterEach(async () => {
      await rm(testDir, { recursive: true, force: true });
    });

    it("returns empty map if directory does not exist", async () => {
      const commands = await loadCommands();
      expect(commands).toBeInstanceOf(Map);
    });

    it("loads valid TOML files", async () => {
      const tomlContent = `name = "review"
description = "Review code for issues"
prompt = "Review this code: {{args}}"`;
      await writeFile(join(testDir, "review.toml"), tomlContent);

      const originalDir = COMMANDS_DIR;
      vi.mock("./loader.js", () => ({
        COMMANDS_DIR: testDir,
      }));

      const commands = await loadCommands();
      expect(commands).toBeInstanceOf(Map);
    });

    it("skips non-TOML files", async () => {
      await writeFile(join(testDir, "readme.txt"), "Not a TOML file");
      const commands = await loadCommands();
      expect(commands.size).toBe(0);
    });
  });
});
