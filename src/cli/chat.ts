// src/cli/chat.ts
import * as readline from 'readline';
import chalk from 'chalk';
import type { Provider, Message } from '../providers/types.js';
import { formatPrompt, streamWrite } from './renderer.js';
import { isCommand, parseCommand, handleCommand, type ChatState } from './commands.js';
import { buildFileContext } from '../context/files.js';

export async function startChat(provider: Provider, model: string): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  let state: ChatState = {
    provider,
    model,
    messages: [],
  };

  console.log(chalk.dim('\nType /help for commands, /exit to quit.\n'));

  const prompt = (): void => {
    rl.question(formatPrompt(state.provider.name, state.model), async (input) => {
      const trimmed = input.trim();

      if (!trimmed) {
        prompt();
        return;
      }

      // Handle commands
      if (isCommand(trimmed)) {
        const command = parseCommand(trimmed);
        const result = await handleCommand(command, state);
        state = result.state;

        if (result.action === 'exit') {
          rl.close();
          return;
        }

        prompt();
        return;
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
        prompt();
        return;
      }

      console.log('\n');

      // Add assistant message
      state.messages.push({ role: 'assistant', content: fullResponse });

      prompt();
    });
  };

  // Handle Ctrl+C gracefully
  rl.on('SIGINT', () => {
    console.log(chalk.dim('\nGoodbye!'));
    rl.close();
  });

  prompt();
}
