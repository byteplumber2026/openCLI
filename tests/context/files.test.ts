// tests/context/files.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileContext, parseFileReferences, formatFileContext } from '../../src/context/files.js';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

const TEST_DIR = '/tmp/open-cli-test';

describe('File Context', () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
    writeFileSync(join(TEST_DIR, 'test.ts'), 'const x = 1;');
    writeFileSync(join(TEST_DIR, 'test.py'), 'x = 1');
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('parses @file references', () => {
    const input = 'What does @test.ts do?';
    const refs = parseFileReferences(input);
    expect(refs).toContain('test.ts');
  });

  it('parses /file command', () => {
    const input = '/file test.ts\nExplain this';
    const refs = parseFileReferences(input);
    expect(refs).toContain('test.ts');
  });

  it('reads file content', async () => {
    const content = await readFileContext(join(TEST_DIR, 'test.ts'));
    expect(content).toBe('const x = 1;');
  });

  it('formats file context', () => {
    const formatted = formatFileContext('test.ts', 'const x = 1;');
    expect(formatted).toContain('<file path="test.ts"');
    expect(formatted).toContain('language="typescript"');
    expect(formatted).toContain('const x = 1;');
  });

  it('detects language from extension', () => {
    const ts = formatFileContext('test.ts', 'code');
    const py = formatFileContext('test.py', 'code');
    expect(ts).toContain('language="typescript"');
    expect(py).toContain('language="python"');
  });
});
