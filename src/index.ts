#!/usr/bin/env node

// Suppress punycode deprecation warning from dependencies
process.removeAllListeners("warning");

import { program } from "commander";
import chalk from "chalk";
import { selectProvider, selectModel } from "./cli/prompt.js";
import { startChat } from "./cli/chat.js";
import { runHeadless, outputResult } from "./cli/headless.js";
import {
  getAvailableProviders,
  SUPPORTED_PROVIDERS,
  getEnvVar,
} from "./config/env.js";
import { createLogger } from "./logging/logger.js";

program
  .name("open-cli")
  .description("Multi-provider CLI AI assistant")
  .version("0.1.0")
  .option("-p, --prompt <text>", "Run in headless mode with a single prompt")
  .option(
    "--provider <name>",
    "Provider to use (openai, gemini, grok, minimax)",
  )
  .option("-m, --model <id>", "Model to use")
  .option(
    "-o, --output-format <format>",
    "Output format (text, json, stream-json)",
    "text",
  )
  .option("--verbose", "Enable info-level logging to stderr")
  .option("--debug", "Enable debug-level logging to stderr")
  .action(async (options) => {
    const logLevel = options.debug
      ? "debug"
      : options.verbose
        ? "info"
        : "silent";
    createLogger(logLevel);

    try {
      // Check for any available providers
      const available = getAvailableProviders();
      if (available.length === 0) {
        console.log(chalk.red("No API keys found. Please set one of:"));
        SUPPORTED_PROVIDERS.forEach((p) => {
          console.log(chalk.yellow(`  ${getEnvVar(p)}`));
        });
        process.exit(1);
      }

      // Select provider (interactive or from flag)
      const provider = await selectProvider(options.provider);

      // Select model (interactive or from flag)
      const model = options.model || (await selectModel(provider));

      // Headless mode
      if (options.prompt) {
        const result = await runHeadless(provider, model, {
          prompt: options.prompt,
          outputFormat: options.outputFormat || "text",
        });
        outputResult(result, options.outputFormat || "text");
        return;
      }

      // Interactive mode
      await startChat(provider, model);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("User force closed")
      ) {
        // User pressed Ctrl+C during prompt
        console.log(chalk.dim("\nGoodbye!"));
        process.exit(0);
      }
      throw error;
    }
  });

program.parse();
