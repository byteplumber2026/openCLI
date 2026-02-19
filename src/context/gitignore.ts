import ignore from "ignore";
import { readFile, access } from "fs/promises";
import { join } from "path";
import { constants } from "fs";

const DEFAULT_IGNORES = [
  "node_modules",
  ".git",
  "dist",
  "build",
  ".env",
  ".env.local",
  ".env.*.local",
  ".DS_Store",
  "*.log",
  "coverage",
  ".cache",
  "*.swp",
  "*.swo",
  "*~",
];

export function getDefaultIgnores(): string[] {
  return [...DEFAULT_IGNORES];
}

export function createIgnoreFilter(
  customPatterns: string[],
): (path: string) => boolean {
  const ig = ignore().add(DEFAULT_IGNORES);

  if (customPatterns.length > 0) {
    ig.add(customPatterns);
  }

  return (path: string) => ig.ignores(path);
}

export async function loadGitignore(
  cwd: string,
): Promise<(path: string) => boolean> {
  const ig = ignore().add(DEFAULT_IGNORES);
  const gitignorePath = join(cwd, ".gitignore");

  try {
    await access(gitignorePath, constants.R_OK);
    const content = await readFile(gitignorePath, "utf-8");
    const lines = content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"));

    if (lines.length > 0) {
      ig.add(lines);
    }
  } catch {
    // .gitignore doesn't exist, use defaults only
  }

  return (path: string) => ig.ignores(path);
}
