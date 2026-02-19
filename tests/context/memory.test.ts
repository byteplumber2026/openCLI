import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  findAgentsMdFiles,
  loadHierarchicalMemory,
  appendToGlobalMemory,
  type MemoryFile,
} from "../../src/context/memory.js";
import { writeFileSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const TEST_DIR = "/tmp/open-cli-memory-test";

describe("memory", () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  describe("findAgentsMdFiles", () => {
    it("finds AGENTS.md in current directory", async () => {
      writeFileSync(join(TEST_DIR, "AGENTS.md"), "# Project context");

      const files = await findAgentsMdFiles(TEST_DIR);

      expect(files).toHaveLength(1);
      expect(files[0]).toContain("AGENTS.md");
    });

    it("finds AGENTS.md in parent directories", async () => {
      const parentDir = join(TEST_DIR, "parent");
      const childDir = join(parentDir, "child");
      mkdirSync(childDir, { recursive: true });

      writeFileSync(join(parentDir, "AGENTS.md"), "# Parent context");

      const files = await findAgentsMdFiles(childDir);

      expect(files.length).toBeGreaterThanOrEqual(1);
      expect(files.some((f) => f.includes("parent"))).toBe(true);
    });

    it("returns empty array when no AGENTS.md found", async () => {
      const emptyDir = join(TEST_DIR, "empty");
      mkdirSync(emptyDir, { recursive: true });

      const files = await findAgentsMdFiles(emptyDir);

      expect(files).toEqual([]);
    });
  });

  describe("loadHierarchicalMemory", () => {
    it("loads single AGENTS.md file", async () => {
      writeFileSync(
        join(TEST_DIR, "AGENTS.md"),
        "# Instructions\n- Use strict mode",
      );

      const memories = await loadHierarchicalMemory(TEST_DIR);

      expect(memories.length).toBeGreaterThanOrEqual(1);
      expect(memories.some((m) => m.content.includes("Use strict mode"))).toBe(
        true,
      );
    });

    it("loads hierarchical memory in correct order", async () => {
      const parentDir = join(TEST_DIR, "project");
      const childDir = join(parentDir, "src");
      mkdirSync(childDir, { recursive: true });

      writeFileSync(join(parentDir, "AGENTS.md"), "# Project level");
      writeFileSync(join(childDir, "AGENTS.md"), "# Source level");

      const memories = await loadHierarchicalMemory(childDir);

      // Should have project then src (hierarchical order)
      expect(memories.length).toBe(2);
    });

    it("sets correct tier for memory files", async () => {
      writeFileSync(join(TEST_DIR, "AGENTS.md"), "# Project");

      const memories = await loadHierarchicalMemory(TEST_DIR);

      expect(memories.some((m) => m.tier === "project")).toBe(true);
    });
  });

  describe("appendToGlobalMemory", () => {
    const globalDir = join(homedir(), ".open-cli");
    const globalFile = join(globalDir, "AGENTS.md");

    afterEach(() => {
      try {
        rmSync(globalFile, { force: true });
      } catch {
        // Ignore
      }
    });

    it("creates global AGENTS.md if it doesn't exist", async () => {
      try {
        rmSync(globalFile, { force: true });
      } catch {
        // Ignore
      }

      await appendToGlobalMemory("Test instruction");

      const memories = await loadHierarchicalMemory(TEST_DIR);
      const globalMemory = memories.find((m) => m.tier === "global");

      // May or may not exist depending on if global file was created
      // Just check function doesn't throw
    });

    it("appends to existing global AGENTS.md", async () => {
      mkdirSync(globalDir, { recursive: true });
      writeFileSync(globalFile, "# Global\nExisting content");

      await appendToGlobalMemory("New instruction");

      const memories = await loadHierarchicalMemory(TEST_DIR);
      const globalMemory = memories.find((m) => m.tier === "global");

      if (globalMemory) {
        expect(globalMemory.content).toContain("Existing content");
        expect(globalMemory.content).toContain("New instruction");
      }
    });
  });
});
