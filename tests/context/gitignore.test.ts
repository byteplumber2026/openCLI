import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import {
  loadGitignore,
  getDefaultIgnores,
  createIgnoreFilter,
} from "../../src/context/gitignore.js";

const TEST_DIR = "/tmp/open-cli-gitignore-test";

describe("gitignore", () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  describe("getDefaultIgnores", () => {
    it("returns list of default ignore patterns", () => {
      const ignores = getDefaultIgnores();

      expect(ignores).toContain("node_modules");
      expect(ignores).toContain(".git");
      expect(ignores).toContain("dist");
      expect(ignores).toContain(".env");
      expect(ignores).toContain(".DS_Store");
    });
  });

  describe("createIgnoreFilter", () => {
    it("filters default ignored paths", () => {
      const filter = createIgnoreFilter([]);

      expect(filter("node_modules")).toBe(true);
      expect(filter(".git")).toBe(true);
      expect(filter("dist")).toBe(true);
      expect(filter(".env")).toBe(true);
      expect(filter("src/index.ts")).toBe(false);
    });

    it("filters custom patterns", () => {
      const filter = createIgnoreFilter(["*.log", "temp/"]);

      expect(filter("debug.log")).toBe(true);
      expect(filter("temp/file.txt")).toBe(true);
      expect(filter("src/main.ts")).toBe(false);
    });

    it("combines default and custom patterns", () => {
      const filter = createIgnoreFilter(["*.test.ts"]);

      expect(filter("node_modules")).toBe(true);
      expect(filter("app.test.ts")).toBe(true);
      expect(filter("app.ts")).toBe(false);
    });
  });

  describe("loadGitignore", () => {
    it("returns filter for directory without .gitignore", async () => {
      const filter = await loadGitignore(TEST_DIR);

      expect(filter("node_modules")).toBe(true);
      expect(filter("src/index.ts")).toBe(false);
    });

    it("loads .gitignore patterns from directory", async () => {
      writeFileSync(
        join(TEST_DIR, ".gitignore"),
        "*.log\ncoverage/\n.env.local\n",
      );

      const filter = await loadGitignore(TEST_DIR);

      expect(filter("debug.log")).toBe(true);
      expect(filter("coverage/report.html")).toBe(true);
      expect(filter(".env.local")).toBe(true);
      expect(filter("src/index.ts")).toBe(false);
    });

    it("handles negation patterns", async () => {
      writeFileSync(join(TEST_DIR, ".gitignore"), "*.log\n!important.log\n");

      const filter = await loadGitignore(TEST_DIR);

      expect(filter("debug.log")).toBe(true);
      expect(filter("important.log")).toBe(false);
    });

    it("handles nested paths", async () => {
      writeFileSync(join(TEST_DIR, ".gitignore"), "build/\nsrc/temp/\n");

      const filter = await loadGitignore(TEST_DIR);

      expect(filter("build/output.js")).toBe(true);
      expect(filter("src/temp/cache.json")).toBe(true);
      expect(filter("src/index.ts")).toBe(false);
    });
  });
});
