#!/usr/bin/env node

import { program } from 'commander';
import chalk from 'chalk';
import { selectProvider, selectModel } from './cli/prompt.js';
import { startChat } from './cli/chat.js';
import { getAvailableProviders } from './config/env.js';

program
  .name('open-cli')
  .description('Multi-provider CLI AI assistant')
  .version('0.1.0')
  .option('-p, --provider <name>', 'Provider to use (openai, grok, minimax)')
  .option('-m, --model <id>', 'Model to use')
  .action(async (options) => {
    try {
      // Check for any available providers
      const available = getAvailableProviders();
      if (available.length === 0) {
        console.log(chalk.red('No API keys found. Please set one of:'));
        console.log(chalk.yellow('  OPENAI_API_KEY'));
        console.log(chalk.yellow('  XAI_API_KEY'));
        console.log(chalk.yellow('  MINIMAX_API_KEY'));
        process.exit(1);
      }

      // Select provider (interactive or from flag)
      const provider = await selectProvider();

      // Select model (interactive or from flag)
      const model = options.model || await selectModel(provider);

      // Start chat
      await startChat(provider, model);
    } catch (error) {
      if (error instanceof Error && error.message.includes('User force closed')) {
        // User pressed Ctrl+C during prompt
        console.log(chalk.dim('\nGoodbye!'));
        process.exit(0);
      }
      throw error;
    }
  });

program.parse();
