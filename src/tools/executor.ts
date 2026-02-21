import { confirm } from "@inquirer/prompts";
import chalk from "chalk";
import type { ToolCall, ToolResult } from "./types.js";
import { shellRun } from "./shell.js";
import { fileRead, fileWrite, fileList, fileSearch } from "./files.js";
import { webSearch } from "./web.js";
import { httpRequest } from "./http.js";
import { traceToolExecution } from "../logging/trace.js";

const SAFE_TOOLS = [
  "file_read",
  "file_list",
  "file_search",
  "web_search",
  "http_request",
];
const SAFE_COMMANDS = [
  /^ls\b/,
  /^cat\b/,
  /^pwd$/,
  /^echo\b/,
  /^head\b/,
  /^tail\b/,
  /^grep\b/,
  /^find\b/,
  /^which\b/,
  /^wc\b/,
];

export function needsConfirmation(
  toolName: string,
  args: Record<string, unknown>,
): boolean {
  if (SAFE_TOOLS.includes(toolName)) {
    if (toolName === "http_request") {
      return args.method !== "GET";
    }
    return false;
  }
  if (toolName === "shell_run") {
    const cmd = args.command as string;
    if (SAFE_COMMANDS.some((r) => r.test(cmd))) return false;
  }
  return true;
}

export async function executeTool(
  call: ToolCall,
  skipConfirm = false,
): Promise<ToolResult> {
  const { id, name, arguments: args } = call;

  // Show what we're about to do
  console.log(chalk.dim(`\n[${name}]`), formatArgs(name, args));

  // Check if confirmation needed
  if (!skipConfirm && needsConfirmation(name, args)) {
    const allowed = await confirm({
      message: `Allow ${name}?`,
      default: true,
    });
    if (!allowed) {
      return {
        id,
        result: "User declined to execute this operation",
        isError: true,
      };
    }
  }

  try {
    const start = Date.now();
    const result = await runTool(name, args);
    const durationMs = Date.now() - start;
    traceToolExecution(name, args, durationMs, result.length);
    console.log(chalk.green("[Done]"));
    console.log(result);
    return { id, result };
  } catch (error: any) {
    const errMsg = error.message || "Unknown error";
    traceToolExecution(name, args, 0, 0);
    console.log(chalk.red("[Error]"), errMsg);
    return { id, result: `Error: ${errMsg}`, isError: true };
  }
}

async function runTool(
  name: string,
  args: Record<string, unknown>,
): Promise<string> {
  switch (name) {
    case "shell_run":
      return shellRun(args as any);
    case "file_read":
      return fileRead(args as any);
    case "file_write":
      return fileWrite(args as any);
    case "file_list":
      return fileList(args as any);
    case "file_search":
      return fileSearch(args as any);
    case "web_search":
      return webSearch(args as any);
    case "http_request":
      return httpRequest(args as any);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

function formatArgs(name: string, args: Record<string, unknown>): string {
  if (name === "shell_run") return args.command as string;
  if (name === "file_read" || name === "file_list") return args.path as string;
  if (name === "file_write")
    return `${args.path} (${(args.content as string).length} bytes)`;
  if (name === "file_search") return `"${args.pattern}" in ${args.path || "."}`;
  if (name === "web_search") return `"${args.query}"`;
  if (name === "http_request") return `${args.method} ${args.url}`;
  return JSON.stringify(args);
}
