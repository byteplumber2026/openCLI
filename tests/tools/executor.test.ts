import { describe, it, expect } from 'vitest';
import { needsConfirmation } from '../../src/tools/executor.js';

describe('Executor', () => {
  it('file_read does not need confirmation', () => {
    expect(needsConfirmation('file_read', { path: 'test.txt' })).toBe(false);
  });

  it('file_list does not need confirmation', () => {
    expect(needsConfirmation('file_list', { path: '.' })).toBe(false);
  });

  it('file_write needs confirmation', () => {
    expect(needsConfirmation('file_write', { path: 'x', content: 'y' })).toBe(true);
  });

  it('shell_run ls does not need confirmation', () => {
    expect(needsConfirmation('shell_run', { command: 'ls -la' })).toBe(false);
  });

  it('shell_run rm needs confirmation', () => {
    expect(needsConfirmation('shell_run', { command: 'rm file.txt' })).toBe(true);
  });

  it('shell_run npm install needs confirmation', () => {
    expect(needsConfirmation('shell_run', { command: 'npm install' })).toBe(true);
  });
});
