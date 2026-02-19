import { stat } from "fs/promises";
import { readFile } from "fs/promises";

interface CacheEntry {
  content: string;
  mtimeMs: number;
  cachedAt: number;
}

const fileCache = new Map<string, CacheEntry>();

const MAX_AGE_MS = 30_000; // 30 seconds max staleness

/**
 * Read a file with mtime-based caching. Returns cached content if the file
 * hasn't been modified since last read and the cache entry is fresh.
 */
export async function readFileCached(filePath: string): Promise<string> {
  const entry = fileCache.get(filePath);
  const now = Date.now();

  if (entry && now - entry.cachedAt < MAX_AGE_MS) {
    // Cache is fresh enough — check mtime
    try {
      const stats = await stat(filePath);
      if (stats.mtimeMs === entry.mtimeMs) {
        return entry.content;
      }
    } catch {
      // File gone — evict and re-throw below
      fileCache.delete(filePath);
    }
  }

  // Cache miss or stale — read from disk
  const content = await readFile(filePath, "utf-8");
  const stats = await stat(filePath);
  fileCache.set(filePath, {
    content,
    mtimeMs: stats.mtimeMs,
    cachedAt: now,
  });

  return content;
}

/** Invalidate a specific file (e.g. after writing to it). */
export function invalidateFile(filePath: string): void {
  fileCache.delete(filePath);
}

/** Clear the entire cache (e.g. on /memory refresh). */
export function clearFileCache(): void {
  fileCache.clear();
}

// --- System prompt cache ---

let cachedSystemPrompt: { prompt: string; memorySig: string } | null = null;

/**
 * Return cached system prompt if the memory signature hasn't changed.
 * memorySig should be a string that changes when any AGENTS.md content changes
 * (e.g. concatenation of file paths + mtimes).
 */
export function getCachedSystemPrompt(
  memorySig: string,
): string | null {
  if (cachedSystemPrompt && cachedSystemPrompt.memorySig === memorySig) {
    return cachedSystemPrompt.prompt;
  }
  return null;
}

export function setCachedSystemPrompt(
  prompt: string,
  memorySig: string,
): void {
  cachedSystemPrompt = { prompt, memorySig };
}
