// src/cli/commands.ts
import chalk from "chalk";
import { select } from "@inquirer/prompts";
import { writeFile } from "fs/promises";
import clipboardy from "clipboardy";
import type { Provider, Message } from "../providers/types.js";
import { selectModel, selectProvider } from "./prompt.js";
import { setStyles, getStyles } from "../config/settings.js";
import {
  loadHierarchicalMemory,
  appendToGlobalMemory,
  formatMemoryForPrompt,
} from "../context/memory.js";
import { mcpRegistry } from "../mcp/registry.js";
import { getMCPServers } from "../config/settings.js";
import {
  saveSession,
  loadSession,
  listSessions,
  deleteSession,
} from "../session/store.js";
import { exportToMarkdown, exportToJSON } from "../session/export.js";
import { loadCommands } from "../commands/loader.js";
import { executeCustomCommand } from "../commands/executor.js";
import { calculateStats, formatStats } from "./stats.js";
import { TOOL_DEFINITIONS } from "../tools/definitions.js";
import { clearFileCache } from "../context/cache.js";
import { createRequire } from "module";
import { UsageTracker } from "../providers/usage.js";

const require = createRequire(import.meta.url);
const { version: APP_VERSION } = require("../../package.json");

export interface Command {
  name: string;
  args: string;
}

export interface ChatState {
  provider: Provider;
  model: string;
  messages: Message[];
  usage: UsageTracker;
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
  /mcp              List MCP servers and tools
  /mcp refresh      Reconnect to MCP servers
  /file       Add file to context (e.g., /file src/index.ts)
  /chat save <tag>   Save current conversation
  /chat list         List saved sessions
  /chat resume <tag> Resume a saved session
  /chat delete <tag> Delete a saved session
  /stats      Show session statistics
  /export md|json [file]  Export conversation (to file or clipboard)
  /copy       Copy last response to clipboard
  /compress   Summarize conversation to save tokens
  /tools      List available tools
  /tools desc Show detailed tool descriptions
  /about      Show version and session info
  /commands list    List custom commands
  /commands reload Reload custom commands
  /styles     Change terminal color theme
  /clear      Clear conversation history
  /help       Show this help message
  /exit       Exit open-cli

${chalk.bold("Custom Commands:")}

  /<custom>        Execute a custom command (e.g., /review)

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
): Promise<{
  action: "continue" | "exit" | "custom_command";
  state: ChatState;
}> {
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
          clearFileCache();
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

    case "mcp": {
      const subCommand = command.args.split(" ")[0] || "list";

      switch (subCommand) {
        case "list":
        case "": {
          const servers = mcpRegistry.listServers();
          if (servers.length === 0) {
            console.log(chalk.dim("No MCP servers connected."));
            console.log(chalk.dim("Configure servers in settings.json"));
          } else {
            console.log(chalk.bold("\nMCP Servers:"));
            for (const server of servers) {
              console.log(
                `  ${chalk.cyan(server.name)} - ${server.toolCount} tools`,
              );
            }

            const tools = mcpRegistry.getTools();
            if (tools.length > 0) {
              console.log(chalk.bold("\nAvailable Tools:"));
              for (const tool of tools.slice(0, 20)) {
                console.log(
                  `  ${chalk.dim(tool.name)} - ${tool.description.slice(0, 60)}...`,
                );
              }
              if (tools.length > 20) {
                console.log(chalk.dim(`  ... and ${tools.length - 20} more`));
              }
            }
          }
          return { action: "continue", state };
        }

        case "refresh": {
          console.log(chalk.dim("Reconnecting to MCP servers..."));
          const configs = getMCPServers();
          await mcpRegistry.connectServers(configs);
          const servers = mcpRegistry.listServers();
          console.log(chalk.dim(`Connected to ${servers.length} MCP servers`));
          return { action: "continue", state };
        }

        default:
          console.log(chalk.yellow("Usage: /mcp [list|refresh]"));
          return { action: "continue", state };
      }
    }

    case "commands": {
      const subCommand = command.args.split(" ")[0] || "list";

      switch (subCommand) {
        case "list":
        case "": {
          const commands = await loadCommands();
          if (commands.size === 0) {
            console.log(chalk.dim("No custom commands found."));
            console.log(chalk.dim(`Add TOML files to ~/.open-cli/commands/`));
          } else {
            console.log(chalk.bold("\nCustom Commands:"));
            for (const [name, cmd] of commands) {
              console.log(`  /${chalk.cyan(name)} - ${cmd.description}`);
            }
          }
          return { action: "continue", state };
        }

        case "reload":
          console.log(chalk.dim("Custom commands reloaded."));
          return { action: "continue", state };

        default:
          console.log(chalk.yellow("Usage: /commands [list|reload]"));
          return { action: "continue", state };
      }
    }

    case "stats": {
      if (state.messages.length === 0) {
        console.log(chalk.dim("No messages in current session."));
        return { action: "continue", state };
      }

      const stats = calculateStats(state.messages);
      const models = state.provider.listModels();
      const modelInfo = models.find((m) => m.id === state.model);

      console.log(chalk.bold("\nSession Statistics:"));
      console.log(
        formatStats(stats, state.usage.getStats(), modelInfo?.contextWindow),
      );
      return { action: "continue", state };
    }

    case "export": {
      if (state.messages.length === 0) {
        console.log(chalk.dim("No messages to export."));
        return { action: "continue", state };
      }

      const parts = command.args.split(" ");
      const format = parts[0] || "md";
      const filePath = parts[1];

      if (format !== "md" && format !== "json") {
        console.log(chalk.yellow("Usage: /export md|json [file]"));
        return { action: "continue", state };
      }

      const session = {
        id: "export",
        tag: "export",
        messages: state.messages,
        provider: state.provider.name,
        model: state.model,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        projectHash: "",
      };

      const content =
        format === "md" ? exportToMarkdown(session) : exportToJSON(session);

      if (filePath) {
        try {
          await writeFile(filePath, content, "utf-8");
          console.log(chalk.dim(`Exported to ${filePath}`));
        } catch (error) {
          console.log(
            chalk.red(
              `Failed to write file: ${error instanceof Error ? error.message : String(error)}`,
            ),
          );
        }
      } else {
        try {
          await clipboardy.write(content);
          console.log(chalk.dim(`Exported ${format} to clipboard.`));
        } catch {
          console.log(content);
        }
      }
      return { action: "continue", state };
    }

    case "copy": {
      const lastAssistant = [...state.messages]
        .reverse()
        .find((m) => m.role === "assistant");

      if (!lastAssistant) {
        console.log(chalk.dim("No assistant response to copy."));
        return { action: "continue", state };
      }

      try {
        await clipboardy.write(lastAssistant.content);
        console.log(chalk.dim("Last response copied to clipboard."));
      } catch (error) {
        console.log(
          chalk.red(
            `Failed to copy: ${error instanceof Error ? error.message : String(error)}`,
          ),
        );
      }
      return { action: "continue", state };
    }

    case "about": {
      console.log(
        [
          "",
          `${chalk.bold("open-cli")} v${APP_VERSION}`,
          `Provider: ${state.provider.name}`,
          `Model: ${state.model}`,
          `Node: ${process.version}`,
          `Platform: ${process.platform} ${process.arch}`,
          "",
        ].join("\n"),
      );
      return { action: "continue", state };
    }

    case "tools": {
      const subCommand = command.args.split(" ")[0] || "list";
      const showDesc = subCommand === "desc";

      console.log(chalk.bold("\nBuilt-in Tools:"));
      for (const tool of TOOL_DEFINITIONS) {
        if (showDesc) {
          console.log(`  ${chalk.cyan(tool.name)}`);
          console.log(`    ${tool.description}`);
          const params = tool.parameters as {
            required?: string[];
            properties?: Record<string, { description?: string }>;
          };
          if (params.properties) {
            for (const [key, val] of Object.entries(params.properties)) {
              const req = params.required?.includes(key) ? " (required)" : "";
              console.log(
                `    ${chalk.dim(`- ${key}${req}`)}: ${val.description || ""}`,
              );
            }
          }
        } else {
          console.log(`  ${chalk.cyan(tool.name)} - ${tool.description}`);
        }
      }

      const mcpTools = mcpRegistry.getTools();
      if (mcpTools.length > 0) {
        console.log(chalk.bold("\nMCP Tools:"));
        for (const tool of mcpTools) {
          if (showDesc) {
            console.log(
              `  ${chalk.cyan(tool.name)} ${chalk.dim(`[${tool.serverName}]`)}`,
            );
            console.log(`    ${tool.description}`);
          } else {
            console.log(
              `  ${chalk.cyan(tool.name)} - ${tool.description.slice(0, 60)}${tool.description.length > 60 ? "..." : ""}`,
            );
          }
        }
      }

      console.log("");
      return { action: "continue", state };
    }

    case "compress": {
      if (state.messages.length < 4) {
        console.log(chalk.dim("Not enough messages to compress."));
        return { action: "continue", state };
      }

      console.log(chalk.dim("Compressing conversation..."));

      const summaryPrompt: Message[] = [
        {
          role: "user",
          content: [
            "Summarize the following conversation concisely. Preserve key decisions, code snippets, and action items. Output only the summary, no preamble.",
            "",
            ...state.messages.map(
              (m) => `[${m.role}]: ${m.content.slice(0, 2000)}`,
            ),
          ].join("\n"),
        },
      ];

      let summary = "";
      try {
        for await (const chunk of state.provider.chat(summaryPrompt, {
          maxTokens: 1024,
        })) {
          summary += chunk.content;
          if (chunk.done) break;
        }
      } catch (error) {
        console.log(
          chalk.red(
            `Failed to compress: ${error instanceof Error ? error.message : String(error)}`,
          ),
        );
        return { action: "continue", state };
      }

      const beforeCount = state.messages.length;
      const compressedMessages: Message[] = [
        {
          role: "user",
          content: "Here is a summary of our prior conversation:\n\n" + summary,
        },
        {
          role: "assistant",
          content:
            "Understood. I have the context from our previous conversation. How can I help?",
        },
      ];

      console.log(
        chalk.dim(`Compressed ${beforeCount} messages down to 2 (summary).`),
      );
      return {
        action: "continue",
        state: { ...state, messages: compressedMessages },
      };
    }

    default: {
      const customCommands = await loadCommands();
      if (customCommands.has(command.name)) {
        const customCmd = customCommands.get(command.name)!;
        const prompt = await executeCustomCommand(customCmd, command.args);
        state.messages.push({ role: "user", content: prompt });
        return { action: "custom_command", state };
      }

      console.log(chalk.yellow(`Unknown command: /${command.name}`));
      console.log(chalk.dim("Type /help for available commands."));
      return { action: "continue", state };
    }
  }
}
