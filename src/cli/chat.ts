// src/cli/chat.ts
import * as readline from "readline";
import chalk from "chalk";
import type { Provider, Message } from "../providers/types.js";
import { formatPrompt, streamWrite } from "./renderer.js";
import {
  isCommand,
  parseCommand,
  handleCommand,
  type ChatState,
} from "./commands.js";
import { buildFileContext } from "../context/files.js";
import {
  TOOL_DEFINITIONS,
  executeTool,
  getSystemPrompt,
} from "../tools/index.js";
import {
  isShellPassthrough,
  isShellModeToggle,
  executeShellPassthrough,
  formatShellOutput,
} from "./shell-passthrough.js";
import { withRetry } from "../providers/retry.js";
import { classifyError } from "../providers/errors.js";
import { getLogger } from "../logging/logger.js";
import { countMessageTokens, countTokens } from "../providers/tokens.js";
import { UsageTracker } from "../providers/usage.js";

async function runShellMode(): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.on("SIGINT", () => {
      rl.close();
      resolve();
    });

    rl.on("line", async (input) => {
      const trimmed = input.trim();
      if (!trimmed) {
        rl.close();
        resolve();
        return;
      }

      try {
        const result = await executeShellPassthrough(trimmed);
        console.log(formatShellOutput(result));
      } catch (error) {
        console.log(chalk.red(`Error: ${error}`));
      }

      process.stdout.write("$ ");
    });

    rl.on("close", () => {
      resolve();
    });

    process.stdout.write("$ ");
  });
}

export async function startChat(
  provider: Provider,
  model: string,
): Promise<void> {
  let state: ChatState = {
    provider,
    model,
    messages: [],
    usage: new UsageTracker(),
  };

  // Set model on provider if supported
  if ("setModel" in provider) {
    (provider as any).setModel(model);
  }

  console.log(chalk.dim("\nType /help for commands, /exit to quit.\n"));

  const createReadline = () => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.on("SIGINT", () => {
      console.log(chalk.dim("\nGoodbye!"));
      rl.close();
      process.exit(0);
    });

    return rl;
  };

  const runLoop = async (): Promise<void> => {
    while (true) {
      const rl = createReadline();

      const input = await new Promise<string>((resolve) => {
        rl.question(
          formatPrompt(state.provider.name, state.model),
          (answer) => {
            rl.close();
            resolve(answer);
          },
        );
      });

      const trimmed = input.trim();

      if (!trimmed) {
        continue;
      }

      // Handle shell passthrough
      if (isShellModeToggle(trimmed)) {
        console.log(
          chalk.yellow(
            "\nShell mode: ON (type commands directly, empty line to exit)",
          ),
        );
        await runShellMode();
        console.log(chalk.yellow("\nShell mode: OFF"));
        continue;
      }

      if (isShellPassthrough(trimmed)) {
        const command = trimmed.slice(1).trim();
        console.log(chalk.dim(`\n$ ${command}`));
        const result = await executeShellPassthrough(command);
        console.log(formatShellOutput(result));
        continue;
      }

      // Handle commands
      if (isCommand(trimmed)) {
        const command = parseCommand(trimmed);
        const result = await handleCommand(command, state);
        state = result.state;

        if (result.action === "exit") {
          return;
        }

        if (result.action === "custom_command") {
          await chatWithTools(state);
        }

        continue;
      }

      // Build file context
      const { context, cleanInput } = await buildFileContext(trimmed);
      const userContent = context ? `${context}\n\n${cleanInput}` : cleanInput;

      state.messages.push({ role: "user", content: userContent });

      // Chat with tool loop
      await chatWithTools(state);
    }
  };

  await runLoop();
}

async function chatWithTools(state: ChatState): Promise<void> {
  const maxIterations = 10; // Prevent infinite loops
  let iterations = 0;

  while (iterations < maxIterations) {
    iterations++;
    console.log();

    let fullResponse = "";
    let toolCalls: any[] | undefined;

    const models = state.provider.listModels();
    const modelInfo = models.find((m) => m.id === state.model);
    const contextWindow = modelInfo?.contextWindow ?? 128000;
    const inputTokens = countMessageTokens(state.messages, state.model);
    const usagePercent = Math.round((inputTokens / contextWindow) * 100);

    if (usagePercent > 80) {
      console.log(
        chalk.yellow(
          `\n⚠ ${usagePercent}% of context window used (${(inputTokens / 1000).toFixed(1)}K/${(contextWindow / 1000).toFixed(0)}K). Consider /compress or /clear.`,
        ),
      );
    }

    getLogger().debug(
      { inputTokens, contextWindow, usagePercent },
      "token_budget",
    );

    const systemPrompt = await getSystemPrompt();

    try {
      const stream = withRetry(
        () =>
          state.provider.chat(state.messages, {
            temperature: 0.7,
            systemPrompt,
            tools: TOOL_DEFINITIONS,
          }),
        { maxRetries: 3, baseDelayMs: 1000, maxDelayMs: 10000 },
        (attempt, delayMs, error) => {
          console.log(
            chalk.dim(
              `\nRetrying in ${delayMs / 1000}s... (attempt ${attempt}/3)`,
            ),
          );
          getLogger().warn(
            { attempt, delayMs, error: error.message },
            "api_retry",
          );
        },
      );

      for await (const chunk of stream) {
        streamWrite(chunk.content);
        fullResponse += chunk.content;
        if (chunk.toolCalls) {
          toolCalls = chunk.toolCalls;
        }
      }
    } catch (error) {
      const classified = classifyError(error);
      const errorMsg = classified.message;
      getLogger().error(
        { error: errorMsg, retryable: classified.retryable },
        "api_error",
      );

      if (classified.retryable) {
        console.log(
          chalk.red(
            `\nError: Provider unavailable after 3 attempts. Your message is preserved — try again or /provider to switch.`,
          ),
        );
      } else {
        console.log(chalk.red(`\nError: ${errorMsg}`));
        state.messages.pop();
      }
      return;
    }

    const outputTokens = countTokens(fullResponse, state.model);
    state.usage.track(inputTokens, outputTokens, state.model);
    getLogger().debug({ inputTokens, outputTokens }, "token_usage");

    // If no tool calls, we're done
    if (!toolCalls || toolCalls.length === 0) {
      console.log("\n");
      state.messages.push({ role: "assistant", content: fullResponse });
      return;
    }

    // Add assistant message with tool calls
    state.messages.push({
      role: "assistant",
      content: fullResponse,
      toolCalls,
    });

    // Execute each tool call
    for (const call of toolCalls) {
      const result = await executeTool(call);
      state.messages.push({
        role: "tool",
        content: result.result,
        toolCallId: call.id,
      });
    }

    // Loop continues - LLM will process tool results
  }

  console.log(chalk.yellow("\nMax tool iterations reached"));
}
