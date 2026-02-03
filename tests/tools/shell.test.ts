import { describe, it, expect } from 'vitest';
import { shellRun } from '../../src/tools/shell.js';

describe('shellRun', () => {
  it('executes simple command', async () => {
    const result = await shellRun({ command: 'echo hello' });
    expect(result).toBe('hello');
  });

  it('returns pwd output', async () => {
    const result = await shellRun({ command: 'pwd' });
    expect(result).toContain('/');
  });

  it('handles command with workdir', async () => {
    const result = await shellRun({ command: 'pwd', workdir: '/tmp' });
    // On macOS, /tmp is a symlink to /private/tmp
    expect(result).toMatch(/^(\/tmp|\/private\/tmp)$/);
  });

  it('throws on invalid command', async () => {
    await expect(shellRun({ command: 'nonexistent_command_xyz' })).rejects.toThrow();
  });
});
