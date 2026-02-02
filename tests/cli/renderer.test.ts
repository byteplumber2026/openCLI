// tests/cli/renderer.test.ts
import { describe, it, expect } from 'vitest';
import { renderMarkdown } from '../../src/cli/renderer.js';

describe('Markdown Renderer', () => {
  it('renders plain text', () => {
    const output = renderMarkdown('Hello world');
    expect(output).toContain('Hello world');
  });

  it('renders code blocks', () => {
    const output = renderMarkdown('```js\nconst x = 1;\n```');
    expect(output).toContain('const');
  });

  it('renders inline code', () => {
    const output = renderMarkdown('Use `npm install`');
    expect(output).toContain('npm install');
  });
});
