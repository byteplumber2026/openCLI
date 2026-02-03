import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { fileRead, fileWrite, fileList, fileSearch } from '../../src/tools/files.js';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';

const TEST_DIR = '/tmp/open-cli-tools-test';

describe('File Tools', () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
    writeFileSync(join(TEST_DIR, 'test.txt'), 'hello world');
    writeFileSync(join(TEST_DIR, 'code.ts'), 'const x = 1;\nconst y = 2;');
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('fileRead reads file content', async () => {
    const result = await fileRead({ path: join(TEST_DIR, 'test.txt') });
    expect(result).toBe('hello world');
  });

  it('fileWrite creates file', async () => {
    const result = await fileWrite({ path: join(TEST_DIR, 'new.txt'), content: 'new content' });
    expect(result).toContain('Wrote');
    const content = await fileRead({ path: join(TEST_DIR, 'new.txt') });
    expect(content).toBe('new content');
  });

  it('fileList lists directory', async () => {
    const result = await fileList({ path: TEST_DIR });
    expect(result).toContain('test.txt');
    expect(result).toContain('code.ts');
  });

  it('fileSearch finds matches', async () => {
    const result = await fileSearch({ pattern: 'const', path: TEST_DIR });
    expect(result).toContain('code.ts');
    expect(result).toContain('const');
  });
});
