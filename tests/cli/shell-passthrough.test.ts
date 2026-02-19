import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  isShellPassthrough,
  isShellModeToggle,
  executeShellPassthrough,
  formatShellOutput,
} from "../../src/cli/shell-passthrough.js";
import { execSync } from "child_process";

describe("shell-passthrough", () => {
  describe("isShellPassthrough", () => {
    it("detects shell command prefix", () => {
      expect(isShellPassthrough("!ls -la")).toBe(true);
      expect(isShellPassthrough("!git status")).toBe(true);
      expect(isShellPassthrough("!npm test")).toBe(true);
    });

    it("returns false for regular input", () => {
      expect(isShellPassthrough("ls -la")).toBe(false);
      expect(isShellPassthrough("hello world")).toBe(false);
      expect(isShellPassthrough("/help")).toBe(false);
    });

    it("returns false for @ references", () => {
      expect(isShellPassthrough("@src/index.ts")).toBe(false);
    });
  });

  describe("isShellModeToggle", () => {
    it("detects lone ! as shell mode toggle", () => {
      expect(isShellModeToggle("!")).toBe(true);
      expect(isShellModeToggle("! ")).toBe(true);
    });

    it("returns false for commands", () => {
      expect(isShellModeToggle("!ls")).toBe(false);
      expect(isShellModeToggle("!git")).toBe(false);
    });
  });

  describe("executeShellPassthrough", () => {
    it("executes shell command and returns output", async () => {
      const result = await executeShellPassthrough("echo hello");
      expect(result.stdout).toContain("hello");
      expect(result.exitCode).toBe(0);
    });

    it("captures stderr on failure", async () => {
      const result = await executeShellPassthrough(
        "ls /nonexistent_directory_12345",
      );
      expect(result.exitCode).not.toBe(0);
    });

    it("handles empty output", async () => {
      const result = await executeShellPassthrough("true");
      expect(result.exitCode).toBe(0);
    });
  });

  describe("formatShellOutput", () => {
    it("formats successful output", () => {
      const output = formatShellOutput({
        stdout: "file1.txt\nfile2.txt",
        stderr: "",
        exitCode: 0,
      });

      expect(output).toContain("file1.txt");
      expect(output).not.toContain("Error");
    });

    it("formats error output", () => {
      const output = formatShellOutput({
        stdout: "",
        stderr: "No such file or directory",
        exitCode: 1,
      });

      expect(output).toContain("Error");
      expect(output).toContain("No such file or directory");
    });

    it("includes exit code in output", () => {
      const output = formatShellOutput({
        stdout: "output",
        stderr: "",
        exitCode: 0,
      });

      expect(output).toContain("exit code: 0");
    });
  });
});
