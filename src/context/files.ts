import { readFile, stat, readdir } from "fs/promises";
import { extname, resolve, join, relative } from "path";
import fg from "fast-glob";
import { createIgnoreFilter } from "./gitignore.js";
import { readFileCached } from "./cache.js";

const MAX_FILE_SIZE = 100 * 1024; // 100KB
const MAX_TOTAL_SIZE = 500 * 1024; // 500KB total
const MAX_FILES = 50;

const LANGUAGE_MAP: Record<string, string> = {
  ".ts": "typescript",
  ".tsx": "typescript",
  ".js": "javascript",
  ".jsx": "javascript",
  ".py": "python",
  ".rb": "ruby",
  ".go": "go",
  ".rs": "rust",
  ".java": "java",
  ".c": "c",
  ".cpp": "cpp",
  ".h": "c",
  ".hpp": "cpp",
  ".cs": "csharp",
  ".php": "php",
  ".swift": "swift",
  ".kt": "kotlin",
  ".scala": "scala",
  ".sh": "bash",
  ".bash": "bash",
  ".zsh": "zsh",
  ".fish": "fish",
  ".sql": "sql",
  ".json": "json",
  ".yaml": "yaml",
  ".yml": "yaml",
  ".toml": "toml",
  ".xml": "xml",
  ".html": "html",
  ".css": "css",
  ".scss": "scss",
  ".md": "markdown",
};

export function parseFileReferences(input: string): string[] {
  const refs: string[] = [];

  // Match @path references (including glob patterns)
  const atMatches = input.matchAll(/@([\w./*-]+)/g);
  for (const match of atMatches) {
    refs.push(match[1]);
  }

  // Match /file path commands
  const fileMatches = input.matchAll(/^\/file\s+([\w./*-]+)/gm);
  for (const match of fileMatches) {
    refs.push(match[1]);
  }

  return [...new Set(refs)];
}

export function detectLanguage(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  return LANGUAGE_MAP[ext] || "text";
}

export async function readFileContext(filePath: string): Promise<string> {
  const absolutePath = resolve(filePath);
  const stats = await stat(absolutePath);

  if (stats.size > MAX_FILE_SIZE) {
    const content = await readFileCached(absolutePath);
    const truncated = content.slice(0, MAX_FILE_SIZE);
    return `${truncated}\n\n[File truncated - exceeded ${MAX_FILE_SIZE / 1024}KB limit]`;
  }

  return readFileCached(absolutePath);
}

export function formatFileContext(filePath: string, content: string): string {
  const language = detectLanguage(filePath);
  return `<file path="${filePath}" language="${language}">\n${content}\n</file>`;
}

export async function scanDirectory(
  dirPath: string,
  basePath?: string,
): Promise<string[]> {
  const base = basePath || dirPath;
  const files: string[] = [];
  const filter = createIgnoreFilter([]);

  async function scan(currentPath: string): Promise<void> {
    try {
      const entries = await readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(currentPath, entry.name);
        const relativePath = relative(base, fullPath);

        if (filter(relativePath)) {
          continue;
        }

        if (entry.isDirectory()) {
          await scan(fullPath);
        } else if (entry.isFile()) {
          files.push(fullPath);
        }
      }
    } catch {
      // Skip directories we can't read
    }
  }

  await scan(dirPath);
  return files;
}

export async function resolveGlobPattern(
  pattern: string,
  cwd?: string,
): Promise<string[]> {
  const workingDir = cwd || process.cwd();
  const filter = createIgnoreFilter([]);
  const files = await fg(pattern, {
    cwd: workingDir,
    absolute: true,
    ignore: ["**/node_modules/**", "**/.git/**", "**/dist/**"],
  });

  // Convert to relative paths for filtering
  return files.filter((f) => !filter(relative(workingDir, f)));
}

export async function resolveFilePatterns(
  patterns: string[],
  cwd?: string,
): Promise<string[]> {
  const workingDir = cwd || process.cwd();
  const files: string[] = [];
  const filter = createIgnoreFilter([]);

  for (const pattern of patterns) {
    const fullPath = resolve(workingDir, pattern);

    try {
      const stats = await stat(fullPath);

      if (stats.isDirectory()) {
        // Scan directory recursively
        const dirFiles = await scanDirectory(fullPath, workingDir);
        files.push(...dirFiles);
      } else if (stats.isFile()) {
        files.push(fullPath);
      }
    } catch {
      // Might be a glob pattern
      if (pattern.includes("*")) {
        const matches = await resolveGlobPattern(pattern, workingDir);
        files.push(...matches);
      }
    }
  }

  // Filter and dedupe
  const unique = [...new Set(files)]
    .map((f) => relative(workingDir, f))
    .filter((f) => !filter(f));
  return unique.slice(0, MAX_FILES).map((f) => resolve(workingDir, f));
}

export async function buildFileContext(
  input: string,
  cwd?: string,
): Promise<{ context: string; cleanInput: string }> {
  const refs = parseFileReferences(input);

  if (refs.length === 0) {
    return { context: "", cleanInput: input };
  }

  const files = await resolveFilePatterns(refs, cwd);
  const contexts: string[] = [];
  let totalSize = 0;

  for (const file of files) {
    try {
      const content = await readFileContext(file);
      const workingDir = cwd || process.cwd();
      const relativePath = relative(workingDir, file);

      // Check total size limit
      if (totalSize + content.length > MAX_TOTAL_SIZE) {
        contexts.push(
          `<file path="${relativePath}" error="Skipped - total context size limit reached" />`,
        );
        continue;
      }

      totalSize += content.length;
      contexts.push(formatFileContext(relativePath, content));
    } catch {
      const workingDir = cwd || process.cwd();
      const relativePath = relative(workingDir, file);
      contexts.push(
        `<file path="${relativePath}" error="File not found or unreadable" />`,
      );
    }
  }

  // Remove file references from input
  let cleanInput = input
    .replace(/@[\w./*-]+/g, "")
    .replace(/^\/file\s+[\w./*-]+\n?/gm, "")
    .trim();

  const context = contexts.join("\n\n");
  return { context, cleanInput };
}
