import { readFile, access, appendFile, mkdir } from "fs/promises";
import { join, dirname } from "path";
import { homedir } from "os";
import { constants } from "fs";
import { readFileCached, invalidateFile } from "./cache.js";

export const AGENTS_MD_NAMES = ["AGENTS.md", "CONTEXT.md", ".agents.md"];

export interface MemoryFile {
  path: string;
  content: string;
  tier: "global" | "project" | "jit";
}

const GLOBAL_DIR = join(homedir(), ".open-cli");
const GLOBAL_AGENTS_MD = join(GLOBAL_DIR, "AGENTS.md");

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

export async function findAgentsMdFiles(startDir: string): Promise<string[]> {
  const files: string[] = [];
  let currentDir = startDir;

  // Walk up the directory tree looking for AGENTS.md files
  while (
    currentDir &&
    currentDir !== "/" &&
    currentDir !== dirname(currentDir)
  ) {
    for (const name of AGENTS_MD_NAMES) {
      const filePath = join(currentDir, name);
      if (await fileExists(filePath)) {
        files.push(filePath);
        break; // Only one AGENTS.md per directory level
      }
    }
    currentDir = dirname(currentDir);
  }

  // Reverse so parent directories come first (higher priority)
  return files.reverse();
}

export async function loadHierarchicalMemory(
  cwd: string,
): Promise<MemoryFile[]> {
  const memories: MemoryFile[] = [];

  // Load global memory (cached)
  if (await fileExists(GLOBAL_AGENTS_MD)) {
    const content = await readFileCached(GLOBAL_AGENTS_MD);
    memories.push({
      path: GLOBAL_AGENTS_MD,
      content: content.trim(),
      tier: "global",
    });
  }

  // Load project-level memory (from cwd up to root, cached)
  const projectFiles = await findAgentsMdFiles(cwd);

  for (const filePath of projectFiles) {
    const content = await readFileCached(filePath);
    memories.push({
      path: filePath,
      content: content.trim(),
      tier: "project",
    });
  }

  return memories;
}

export async function appendToGlobalMemory(text: string): Promise<void> {
  // Ensure directory exists
  await mkdir(GLOBAL_DIR, { recursive: true });

  // Check if file exists
  const exists = await fileExists(GLOBAL_AGENTS_MD);

  if (exists) {
    // Append with newline
    await appendFile(GLOBAL_AGENTS_MD, `\n${text}`);
  } else {
    // Create new file with content
    const { writeFile } = await import("fs/promises");
    await writeFile(GLOBAL_AGENTS_MD, `# Global Context\n\n${text}\n`);
  }

  // Invalidate cache so next load picks up the change
  invalidateFile(GLOBAL_AGENTS_MD);
}

export function formatMemoryForPrompt(memories: MemoryFile[]): string {
  if (memories.length === 0) {
    return "";
  }

  const sections = memories.map((m) => {
    const header = `<!-- Memory: ${m.path} (${m.tier}) -->`;
    return `${header}\n${m.content}`;
  });

  return `<memory>\n${sections.join("\n\n")}\n</memory>`;
}
