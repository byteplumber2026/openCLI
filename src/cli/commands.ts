// src/cli/commands.ts
import chalk from "chalk";
import { select } from "@inquirer/prompts";
import type { Provider, Message } from "../providers/types.js";
import { selectModel, selectProvider } from "./prompt.js";
import { setStyles, getStyles } from "../config/settings.js";
import {
  loadHierarchicalMemory,
  appendToGlobalMemory,
  formatMemoryForPrompt,
} from "../context/memory.js";
import {
  saveSession,
  loadSession,
  listSessions,
  deleteSession,
} from "../session/store.js";

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
  return input.trim().startsWith("/");
}

export function parseCommand(input: string): Command {
  const trimmed = input.trim().slice(1); // Remove leading /
  const spaceIndex = trimmed.indexOf(" ");

  if (spaceIndex === -1) {
    return { name: trimmed, args: "" };
  }

  return {
    name: trimmed.slice(0, spaceIndex),
    args: trimmed.slice(spaceIndex + 1).trim(),
  };
}

const HELP_TEXT = `
${chalk.bold("Available Commands:")}

  /models     Switch to a different model
  /provider   Switch to a different provider
  /memory     Manage context memory (show, add, list, refresh)
  /file       Add file to context (e.g., /file src/index.ts)
  /chat save <tag>   Save current conversation
  /chat list         List saved sessions
  /chat resume <tag> Resume a saved session
  /chat delete <tag> Delete a saved session
  /styles     Change terminal color theme
  /clear      Clear conversation history
  /help       Show this help message
  /exit       Exit open-cli

${chalk.bold("File Context:")}

  Use @filename to reference files inline:
  ${chalk.dim("What does @src/index.ts do?")}

${chalk.bold("Shell Passthrough:")}

  Use !command to execute shell commands:
  ${chalk.dim("!ls -la")}
  ${chalk.dim("!         (toggle shell mode)")}
`;

export async function handleCommand(
  command: Command,
  state: ChatState,
): Promise<{ action: "continue" | "exit"; state: ChatState }> {
  switch (command.name) {
    case "help":
      console.log(HELP_TEXT);
      return { action: "continue", state };

    case "exit":
    case "quit":
      console.log(chalk.dim("Goodbye!"));
      return { action: "exit", state };

    case "clear":
      console.log(chalk.dim("Conversation cleared."));
      return { action: "continue", state: { ...state, messages: [] } };

    case "models": {
      const model = await selectModel(state.provider, true);
      console.log(chalk.dim(`Switched to ${model}`));
      return { action: "continue", state: { ...state, model } };
    }

    case "provider": {
      const provider = await selectProvider(true);
      const model = await selectModel(provider, true);
      console.log(chalk.dim(`Switched to ${provider.name}/${model}`));
      return {
        action: "continue",
        state: { ...state, provider, model, messages: [] },
      };
    }

    case "styles": {
      const colors = [
        "cyan",
        "green",
        "yellow",
        "magenta",
        "blue",
        "red",
        "white",
      ];
      const current = getStyles();

      const color = await select({
        message: "Select prompt color:",
        choices: colors.map((c) => ({
          name: (chalk as any)[c](c),
          value: c,
        })),
        default: current.promptColor,
      });

      setStyles({ promptColor: color });
      console.log(chalk.dim(`Style updated.`));
      return { action: "continue", state };
    }

    case "file":
      console.log(
        chalk.dim(`File ${command.args} will be included in next message.`),
      );
      return { action: "continue", state };

    case "memory": {
      const subCommand = command.args.split(" ")[0] || "show";
      const restArgs = command.args.slice(subCommand.length).trim();

      switch (subCommand) {
        case "show": {
          const memories = await loadHierarchicalMemory(process.cwd());
          if (memories.length === 0) {
            console.log(chalk.dim("No memory files loaded."));
          } else {
            console.log(chalk.bold("\nLoaded Memory:"));
            console.log(formatMemoryForPrompt(memories));
          }
          return { action: "continue", state };
        }

        case "add": {
          if (!restArgs) {
            console.log(chalk.yellow("Usage: /memory add <text>"));
            return { action: "continue", state };
          }
          await appendToGlobalMemory(restArgs);
          console.log(chalk.dim("Added to global memory."));
          return { action: "continue", state };
        }

        case "list": {
          const memories = await loadHierarchicalMemory(process.cwd());
          if (memories.length === 0) {
            console.log(chalk.dim("No memory files found."));
          } else {
            console.log(chalk.bold("\nMemory Files:"));
            memories.forEach((m) => {
              const tier = chalk.dim(`[${m.tier}]`);
              console.log(`  ${tier} ${m.path}`);
            });
          }
          return { action: "continue", state };
        }

        case "refresh":
          console.log(chalk.dim("Memory refreshed."));
          return { action: "continue", state };

        default:
          console.log(chalk.yellow("Usage: /memory [show|add|list|refresh]"));
          return { action: "continue", state };
      }
    }

    case "chat": {
      const subCommand = command.args.split(" ")[0] || "list";
      const restArgs = command.args.slice(subCommand.length).trim();

      switch (subCommand) {
        case "save": {
          if (!restArgs) {
            console.log(chalk.yellow("Usage: /chat save <tag>"));
            return { action: "continue", state };
          }

          try {
            const session = await saveSession(
              restArgs,
              state.messages,
              state.provider.name,
              state.model,
              process.cwd(),
            );
            console.log(chalk.dim(`Session saved: ${session.tag}`));
          } catch (error) {
            console.log(
              chalk.red(
                `Failed to save session: ${error instanceof Error ? error.message : String(error)}`,
              ),
            );
          }
          return { action: "continue", state };
        }

        case "list": {
          try {
            const sessions = await listSessions(process.cwd());
            if (sessions.length === 0) {
              console.log(chalk.dim("No saved sessions."));
            } else {
              console.log(chalk.bold("\nSaved Sessions:"));
              sessions.forEach((s) => {
                console.log(
                  `  ${chalk.cyan(s.tag)} - ${s.messageCount} messages, ${s.model}`,
                );
                console.log(
                  `    Updated: ${new Date(s.updatedAt).toLocaleString()}`,
                );
              });
            }
          } catch (error) {
            console.log(
              chalk.red(
                `Failed to list sessions: ${error instanceof Error ? error.message : String(error)}`,
              ),
            );
          }
          return { action: "continue", state };
        }

        case "resume": {
          if (!restArgs) {
            console.log(chalk.yellow("Usage: /chat resume <tag>"));
            return { action: "continue", state };
          }

          try {
            const session = await loadSession(restArgs, process.cwd());
            if (!session) {
              console.log(chalk.red(`Session not found: ${restArgs}`));
              return { action: "continue", state };
            }

            console.log(
              chalk.dim(
                `Resumed session: ${session.tag} (${session.messages.length} messages)`,
              ),
            );
            return {
              action: "continue",
              state: {
                ...state,
                messages: session.messages,
                model: session.model,
              },
            };
          } catch (error) {
            console.log(
              chalk.red(
                `Failed to resume session: ${error instanceof Error ? error.message : String(error)}`,
              ),
            );
            return { action: "continue", state };
          }
        }

        case "delete": {
          if (!restArgs) {
            console.log(chalk.yellow("Usage: /chat delete <tag>"));
            return { action: "continue", state };
          }

          try {
            const deleted = await deleteSession(restArgs, process.cwd());
            if (deleted) {
              console.log(chalk.dim(`Session deleted: ${restArgs}`));
            } else {
              console.log(chalk.red(`Session not found: ${restArgs}`));
            }
          } catch (error) {
            console.log(
              chalk.red(
                `Failed to delete session: ${error instanceof Error ? error.message : String(error)}`,
              ),
            );
          }
          return { action: "continue", state };
        }

        default:
          console.log(chalk.yellow("Usage: /chat [save|list|resume|delete]"));
          return { action: "continue", state };
      }
    }

    default:
      console.log(chalk.yellow(`Unknown command: /${command.name}`));
      console.log(chalk.dim("Type /help for available commands."));
      return { action: "continue", state };
  }
}
