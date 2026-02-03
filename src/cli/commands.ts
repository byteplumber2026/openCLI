// src/cli/commands.ts
import chalk from 'chalk';
import { select } from '@inquirer/prompts';
import type { Provider, Message } from '../providers/types.js';
import { selectModel, selectProvider } from './prompt.js';
import { setStyles, getStyles } from '../config/settings.js';

export interface Command {
  name: string;
  args: string;
}

export interface ChatState {
  provider: Provider;
  model: string;
  messages: Message[];
}

export function isCommand(input: string): boolean {
  return input.trim().startsWith('/');
}

export function parseCommand(input: string): Command {
  const trimmed = input.trim().slice(1); // Remove leading /
  const spaceIndex = trimmed.indexOf(' ');

  if (spaceIndex === -1) {
    return { name: trimmed, args: '' };
  }

  return {
    name: trimmed.slice(0, spaceIndex),
    args: trimmed.slice(spaceIndex + 1).trim(),
  };
}

const HELP_TEXT = `
${chalk.bold('Available Commands:')}

  /models     Switch to a different model
  /provider   Switch to a different provider
  /file       Add file to context (e.g., /file src/index.ts)
  /styles     Change terminal color theme
  /clear      Clear conversation history
  /help       Show this help message
  /exit       Exit open-cli

${chalk.bold('File Context:')}

  Use @filename to reference files inline:
  ${chalk.dim('What does @src/index.ts do?')}
`;

export async function handleCommand(
  command: Command,
  state: ChatState
): Promise<{ action: 'continue' | 'exit'; state: ChatState }> {
  switch (command.name) {
    case 'help':
      console.log(HELP_TEXT);
      return { action: 'continue', state };

    case 'exit':
    case 'quit':
      console.log(chalk.dim('Goodbye!'));
      return { action: 'exit', state };

    case 'clear':
      console.log(chalk.dim('Conversation cleared.'));
      return { action: 'continue', state: { ...state, messages: [] } };

    case 'models': {
      const model = await selectModel(state.provider, true);
      console.log(chalk.dim(`Switched to ${model}`));
      return { action: 'continue', state: { ...state, model } };
    }

    case 'provider': {
      const provider = await selectProvider();
      const model = await selectModel(provider);
      console.log(chalk.dim(`Switched to ${provider.name}/${model}`));
      return { action: 'continue', state: { ...state, provider, model, messages: [] } };
    }

    case 'styles': {
      const colors = ['cyan', 'green', 'yellow', 'magenta', 'blue', 'red', 'white'];
      const current = getStyles();

      const color = await select({
        message: 'Select prompt color:',
        choices: colors.map(c => ({
          name: (chalk as any)[c](c),
          value: c,
        })),
        default: current.promptColor,
      });

      setStyles({ promptColor: color });
      console.log(chalk.dim(`Style updated.`));
      return { action: 'continue', state };
    }

    case 'file':
      console.log(chalk.dim(`File ${command.args} will be included in next message.`));
      return { action: 'continue', state };

    default:
      console.log(chalk.yellow(`Unknown command: /${command.name}`));
      console.log(chalk.dim('Type /help for available commands.'));
      return { action: 'continue', state };
  }
}
