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

    try {
      for await (const chunk of state.provider.chat(state.messages, {
        temperature: 0.7,
        systemPrompt: await getSystemPrompt(),
        tools: TOOL_DEFINITIONS,
      })) {
        streamWrite(chunk.content);
        fullResponse += chunk.content;
        if (chunk.toolCalls) {
          toolCalls = chunk.toolCalls;
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      console.log(chalk.red(`\nError: ${errorMsg}`));
      state.messages.pop();
      return;
    }

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
