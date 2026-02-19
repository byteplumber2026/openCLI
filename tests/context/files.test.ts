// tests/context/files.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  readFileContext,
  parseFileReferences,
  formatFileContext,
  scanDirectory,
  resolveGlobPattern,
  buildFileContext,
} from "../../src/context/files.js";
import { writeFileSync, mkdirSync, rmSync } from "fs";
import { join } from "path";

const TEST_DIR = "/tmp/open-cli-test";

describe("File Context", () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
    writeFileSync(join(TEST_DIR, "test.ts"), "const x = 1;");
    writeFileSync(join(TEST_DIR, "test.py"), "x = 1");
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it("parses @file references", () => {
    const input = "What does @test.ts do?";
    const refs = parseFileReferences(input);
    expect(refs).toContain("test.ts");
  });

  it("parses /file command", () => {
    const input = "/file test.ts\nExplain this";
    const refs = parseFileReferences(input);
    expect(refs).toContain("test.ts");
  });

  it("reads file content", async () => {
    const content = await readFileContext(join(TEST_DIR, "test.ts"));
    expect(content).toBe("const x = 1;");
  });

  it("formats file context", () => {
    const formatted = formatFileContext("test.ts", "const x = 1;");
    expect(formatted).toContain('<file path="test.ts"');
    expect(formatted).toContain('language="typescript"');
    expect(formatted).toContain("const x = 1;");
  });

  it("detects language from extension", () => {
    const ts = formatFileContext("test.ts", "code");
    const py = formatFileContext("test.py", "code");
    expect(ts).toContain('language="typescript"');
    expect(py).toContain('language="python"');
  });
});

describe("Enhanced File Context", () => {
  const MULTI_DIR = "/tmp/open-cli-multi-test";

  beforeEach(() => {
    rmSync(MULTI_DIR, { recursive: true, force: true });
    mkdirSync(join(MULTI_DIR, "src", "utils"), { recursive: true });
    mkdirSync(join(MULTI_DIR, "node_modules", "pkg"), { recursive: true });
    mkdirSync(join(MULTI_DIR, ".git", "objects"), { recursive: true });

    writeFileSync(
      join(MULTI_DIR, "src", "index.ts"),
      'export * from "./utils";',
    );
    writeFileSync(
      join(MULTI_DIR, "src", "utils", "helpers.ts"),
      "export const help = () => {};",
    );
    writeFileSync(
      join(MULTI_DIR, "node_modules", "pkg", "index.js"),
      "module.exports = {};",
    );
    writeFileSync(join(MULTI_DIR, ".git", "config"), "[core]");
  });

  afterEach(() => {
    rmSync(MULTI_DIR, { recursive: true, force: true });
  });

  describe("parseFileReferences", () => {
    it("parses directory references", () => {
      const refs = parseFileReferences("Check @src/");
      expect(refs).toContain("src/");
    });

    it("parses glob patterns", () => {
      const refs = parseFileReferences("Check @src/**/*.ts");
      expect(refs).toContain("src/**/*.ts");
    });

    it("parses multiple references", () => {
      const refs = parseFileReferences("Check @src/index.ts and @README.md");
      expect(refs).toContain("src/index.ts");
      expect(refs).toContain("README.md");
    });
  });

  describe("scanDirectory", () => {
    it("scans directory recursively", async () => {
      const files = await scanDirectory(join(MULTI_DIR, "src"));
      expect(files.length).toBeGreaterThanOrEqual(2);
      expect(files.some((f) => f.endsWith("index.ts"))).toBe(true);
      expect(files.some((f) => f.endsWith("helpers.ts"))).toBe(true);
    });

    it("filters out node_modules", async () => {
      const files = await scanDirectory(MULTI_DIR);
      expect(files.some((f) => f.includes("node_modules"))).toBe(false);
    });

    it("filters out .git directory", async () => {
      const files = await scanDirectory(MULTI_DIR);
      expect(files.some((f) => f.includes(".git"))).toBe(false);
    });
  });

  describe("resolveGlobPattern", () => {
    it("resolves glob patterns", async () => {
      const originalCwd = process.cwd();
      process.chdir(MULTI_DIR);
      try {
        const files = await resolveGlobPattern("src/**/*.ts");
        expect(files.length).toBe(2);
        expect(files.some((f) => f.endsWith("index.ts"))).toBe(true);
        expect(files.some((f) => f.endsWith("helpers.ts"))).toBe(true);
      } finally {
        process.chdir(originalCwd);
      }
    });

    it("returns empty array for no matches", async () => {
      const originalCwd = process.cwd();
      process.chdir(MULTI_DIR);
      try {
        const files = await resolveGlobPattern("nonexistent/*.ts");
        expect(files).toEqual([]);
      } finally {
        process.chdir(originalCwd);
      }
    });
  });

  describe("buildFileContext", () => {
    it("builds context from directory", async () => {
      const { context, cleanInput } = await buildFileContext(
        "Check @src/",
        MULTI_DIR,
      );

      expect(context).toContain("index.ts");
      expect(context).toContain("helpers.ts");
      expect(cleanInput).toBe("Check");
    });

    it("builds context from glob pattern", async () => {
      const { context } = await buildFileContext(
        "Check @src/**/*.ts",
        MULTI_DIR,
      );

      expect(context).toContain("index.ts");
      expect(context).toContain("helpers.ts");
    });

    it("excludes ignored files from context", async () => {
      const { context } = await buildFileContext("Check @/", MULTI_DIR);

      expect(context).not.toContain("node_modules");
      expect(context).not.toContain(".git");
    });
  });
});
