// src/cli/renderer.ts
import { marked } from 'marked';
import TerminalRenderer from 'marked-terminal';
import chalk from 'chalk';
import { getStyles } from '../config/settings.js';

// Configure marked with terminal renderer
marked.setOptions({
  renderer: new TerminalRenderer({
    code: chalk.yellow,
    blockquote: chalk.gray.italic,
    html: chalk.gray,
    heading: chalk.bold,
    firstHeading: chalk.bold.underline,
    hr: chalk.gray,
    listitem: chalk.reset,
    paragraph: chalk.reset,
    strong: chalk.bold,
    em: chalk.italic,
    codespan: chalk.yellow,
    del: chalk.strikethrough,
    link: chalk.blue.underline,
    href: chalk.blue.underline,
  }),
});

export function renderMarkdown(text: string): string {
  return marked.parse(text) as string;
}

export function getPromptColor(): typeof chalk {
  const styles = getStyles();
  const colorName = styles.promptColor as keyof typeof chalk;
  return (chalk[colorName] as typeof chalk) || chalk.cyan;
}

export function formatPrompt(provider: string, model: string): string {
  const color = getPromptColor();
  return color(`open_cli (${provider}/${model}) > `);
}

export function streamWrite(text: string): void {
  process.stdout.write(text);
}

export function clearLine(): void {
  process.stdout.write('\r\x1b[K');
}
