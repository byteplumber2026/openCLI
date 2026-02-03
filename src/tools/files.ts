import { readFile, writeFile, readdir } from 'fs/promises';
import { join, resolve } from 'path';
import fg from 'fast-glob';

export interface FileReadArgs {
  path: string;
}

export interface FileWriteArgs {
  path: string;
  content: string;
}

export interface FileListArgs {
  path: string;
  recursive?: boolean;
}

export interface FileSearchArgs {
  pattern: string;
  path?: string;
  glob?: string;
}

export async function fileRead(args: FileReadArgs): Promise<string> {
  const content = await readFile(resolve(args.path), 'utf-8');
  return content;
}

export async function fileWrite(args: FileWriteArgs): Promise<string> {
  await writeFile(resolve(args.path), args.content, 'utf-8');
  return `Wrote ${args.content.length} bytes to ${args.path}`;
}

export async function fileList(args: FileListArgs): Promise<string> {
  const dirPath = resolve(args.path);

  if (args.recursive) {
    const files = await fg('**/*', { cwd: dirPath, onlyFiles: false, markDirectories: true });
    return files.join('\n') || '(empty directory)';
  }

  const entries = await readdir(dirPath, { withFileTypes: true });
  const lines = entries.map(e => e.isDirectory() ? `${e.name}/` : e.name);
  return lines.join('\n') || '(empty directory)';
}

export async function fileSearch(args: FileSearchArgs): Promise<string> {
  const searchPath = resolve(args.path || '.');
  const globPattern = args.glob || '**/*';
  const regex = new RegExp(args.pattern);

  const files = await fg(globPattern, { cwd: searchPath, onlyFiles: true });
  const results: string[] = [];

  for (const file of files.slice(0, 100)) {
    try {
      const content = await readFile(join(searchPath, file), 'utf-8');
      const lines = content.split('\n');
      lines.forEach((line, i) => {
        if (regex.test(line)) {
          results.push(`${file}:${i + 1}: ${line.trim()}`);
        }
      });
    } catch {
      // Skip unreadable files
    }
  }

  return results.slice(0, 50).join('\n') || 'No matches found';
}
