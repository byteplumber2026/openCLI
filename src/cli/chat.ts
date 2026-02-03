// src/cli/chat.ts
import * as readline from 'readline';
import chalk from 'chalk';
import type { Provider, Message } from '../providers/types.js';
import { formatPrompt, streamWrite } from './renderer.js';
import { isCommand, parseCommand, handleCommand, type ChatState } from './commands.js';
import { buildFileContext } from '../context/files.js';

export async function startChat(provider: Provider, model: string): Promise<void> {
  let state: ChatState = {
    provider,
    model,
    messages: [],
  };

  console.log(chalk.dim('\nType /help for commands, /exit to quit.\n'));

  const createReadline = () => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.on('SIGINT', () => {
      console.log(chalk.dim('\nGoodbye!'));
      rl.close();
      process.exit(0);
    });

    return rl;
  };

  const runLoop = async (): Promise<void> => {
    while (true) {
      const rl = createReadline();

      const input = await new Promise<string>((resolve) => {
        rl.question(formatPrompt(state.provider.name, state.model), (answer) => {
          rl.close();
          resolve(answer);
        });
      });

      const trimmed = input.trim();

      if (!trimmed) {
        continue;
      }

      // Handle commands
      if (isCommand(trimmed)) {
        const command = parseCommand(trimmed);
        const result = await handleCommand(command, state);
        state = result.state;

        if (result.action === 'exit') {
          return;
        }

        continue;
      }

      // Build file context
      const { context, cleanInput } = await buildFileContext(trimmed);
      const userContent = context ? `${context}\n\n${cleanInput}` : cleanInput;

      // Add user message
      state.messages.push({ role: 'user', content: userContent });

      // Stream response
      console.log();
      let fullResponse = '';

      try {
        for await (const chunk of state.provider.chat(state.messages, {
          temperature: 0.7,
        })) {
          streamWrite(chunk.content);
          fullResponse += chunk.content;
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.log(chalk.red(`\nError: ${errorMsg}`));
        state.messages.pop(); // Remove failed user message
        continue;
      }

      console.log('\n');

      // Add assistant message
      state.messages.push({ role: 'assistant', content: fullResponse });
    }
  };

  await runLoop();
}
