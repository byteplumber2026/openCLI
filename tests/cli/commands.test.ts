// tests/cli/commands.test.ts
import { describe, it, expect } from 'vitest';
import { parseCommand, isCommand } from '../../src/cli/commands.js';

describe('Commands', () => {
  it('detects command input', () => {
    expect(isCommand('/help')).toBe(true);
    expect(isCommand('/models')).toBe(true);
    expect(isCommand('hello')).toBe(false);
  });

  it('parses command name', () => {
    expect(parseCommand('/help').name).toBe('help');
    expect(parseCommand('/file src/index.ts').name).toBe('file');
  });

  it('parses command args', () => {
    expect(parseCommand('/file src/index.ts').args).toBe('src/index.ts');
    expect(parseCommand('/help').args).toBe('');
  });
});
