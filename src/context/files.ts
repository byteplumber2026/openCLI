// src/context/files.ts
import { readFile, stat } from 'fs/promises';
import { extname, resolve } from 'path';
import fg from 'fast-glob';

const MAX_FILE_SIZE = 100 * 1024; // 100KB
const MAX_FILES = 10;

const LANGUAGE_MAP: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.py': 'python',
  '.rb': 'ruby',
  '.go': 'go',
  '.rs': 'rust',
  '.java': 'java',
  '.c': 'c',
  '.cpp': 'cpp',
  '.h': 'c',
  '.hpp': 'cpp',
  '.cs': 'csharp',
  '.php': 'php',
  '.swift': 'swift',
  '.kt': 'kotlin',
  '.scala': 'scala',
  '.sh': 'bash',
  '.bash': 'bash',
  '.zsh': 'zsh',
  '.fish': 'fish',
  '.sql': 'sql',
  '.json': 'json',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.toml': 'toml',
  '.xml': 'xml',
  '.html': 'html',
  '.css': 'css',
  '.scss': 'scss',
  '.md': 'markdown',
};

export function parseFileReferences(input: string): string[] {
  const refs: string[] = [];

  // Match @path references
  const atMatches = input.matchAll(/@([\w./-]+)/g);
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
  return LANGUAGE_MAP[ext] || 'text';
}

export async function readFileContext(filePath: string): Promise<string> {
  const absolutePath = resolve(filePath);
  const stats = await stat(absolutePath);

  if (stats.size > MAX_FILE_SIZE) {
    const content = await readFile(absolutePath, 'utf-8');
    const truncated = content.slice(0, MAX_FILE_SIZE);
    return `${truncated}\n\n[File truncated - exceeded ${MAX_FILE_SIZE / 1024}KB limit]`;
  }

  return readFile(absolutePath, 'utf-8');
}

export function formatFileContext(filePath: string, content: string): string {
  const language = detectLanguage(filePath);
  return `<file path="${filePath}" language="${language}">\n${content}\n</file>`;
}

export async function resolveFilePatterns(patterns: string[]): Promise<string[]> {
  const files: string[] = [];

  for (const pattern of patterns) {
    if (pattern.includes('*')) {
      const matches = await fg(pattern, { cwd: process.cwd() });
      files.push(...matches);
    } else {
      files.push(pattern);
    }
  }

  return [...new Set(files)].slice(0, MAX_FILES);
}

export async function buildFileContext(input: string): Promise<{ context: string; cleanInput: string }> {
  const refs = parseFileReferences(input);

  if (refs.length === 0) {
    return { context: '', cleanInput: input };
  }

  const files = await resolveFilePatterns(refs);
  const contexts: string[] = [];

  for (const file of files) {
    try {
      const content = await readFileContext(file);
      contexts.push(formatFileContext(file, content));
    } catch (error) {
      contexts.push(`<file path="${file}" error="File not found or unreadable" />`);
    }
  }

  // Remove file references from input
  let cleanInput = input
    .replace(/@[\w./-]+/g, '')
    .replace(/^\/file\s+[\w./*-]+\n?/gm, '')
    .trim();

  const context = contexts.join('\n\n');
  return { context, cleanInput };
}
