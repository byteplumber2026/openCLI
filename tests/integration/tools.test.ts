// tests/integration/tools.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { shellRun } from '../../src/tools/shell.js';
import { fileRead, fileWrite, fileList } from '../../src/tools/files.js';
import { needsConfirmation } from '../../src/tools/executor.js';
import { TOOL_DEFINITIONS } from '../../src/tools/definitions.js';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';

const TEST_DIR = '/tmp/open-cli-integration-test';

describe('Tools Integration', () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
    writeFileSync(join(TEST_DIR, 'test.txt'), 'test content');
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('shell + file tools work together', async () => {
    // List files
    const listResult = await fileList({ path: TEST_DIR });
    expect(listResult).toContain('test.txt');

    // Read file
    const readResult = await fileRead({ path: join(TEST_DIR, 'test.txt') });
    expect(readResult).toBe('test content');

    // Shell command
    const shellResult = await shellRun({ command: `ls ${TEST_DIR}` });
    expect(shellResult).toContain('test.txt');
  });

  it('confirmation logic works correctly', () => {
    expect(needsConfirmation('file_read', {})).toBe(false);
    expect(needsConfirmation('file_write', {})).toBe(true);
    expect(needsConfirmation('shell_run', { command: 'ls' })).toBe(false);
    expect(needsConfirmation('shell_run', { command: 'rm -rf /' })).toBe(true);
  });

  it('all tool definitions are valid', () => {
    expect(TOOL_DEFINITIONS.length).toBe(5);
    for (const tool of TOOL_DEFINITIONS) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.parameters.type).toBe('object');
    }
  });
});
