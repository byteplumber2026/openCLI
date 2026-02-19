import chalk from "chalk";
import type { Provider, Message } from "../providers/types.js";
import {
  TOOL_DEFINITIONS,
  executeTool,
  getSystemPrompt,
} from "../tools/index.js";
import { buildFileContext } from "../context/files.js";

export interface HeadlessOptions {
  prompt: string;
  outputFormat: "text" | "json" | "stream-json";
}

export interface HeadlessResult {
  response: string;
  toolCalls: ToolCallRecord[];
  stats: {
    duration: number;
    toolCallsCount: number;
  };
}

export interface ToolCallRecord {
  name: string;
  arguments: Record<string, unknown>;
  result: string;
  isError?: boolean;
}

export async function runHeadless(
  provider: Provider,
  model: string,
  options: HeadlessOptions,
): Promise<HeadlessResult> {
  const startTime = Date.now();
  const toolCallsRecord: ToolCallRecord[] = [];

  const { context, cleanInput } = await buildFileContext(options.prompt);
  const userContent = context ? `${context}\n\n${cleanInput}` : cleanInput;
  const messages: Message[] = [{ role: "user", content: userContent }];

  let fullResponse = "";
  let iterations = 0;
  const maxIterations = 10;

  while (iterations < maxIterations) {
    iterations++;
    let response = "";
    let toolCalls: any[] | undefined;

    try {
      for await (const chunk of provider.chat(messages, {
        temperature: 0.7,
        systemPrompt: await getSystemPrompt(),
        tools: TOOL_DEFINITIONS,
      })) {
        response += chunk.content;
        if (chunk.toolCalls) {
          toolCalls = chunk.toolCalls;
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      if (
        options.outputFormat === "json" ||
        options.outputFormat === "stream-json"
      ) {
        console.log(JSON.stringify({ error: errorMsg, type: "error" }));
      } else {
        console.error(chalk.red(`Error: ${errorMsg}`));
      }
      process.exit(1);
    }

    if (!toolCalls || toolCalls.length === 0) {
      fullResponse = response;
      break;
    }

    messages.push({ role: "assistant", content: response, toolCalls });

    for (const call of toolCalls) {
      const result = await executeTool(call, true);
      toolCallsRecord.push({
        name: call.name,
        arguments: call.arguments,
        result: result.result,
        isError: result.isError,
      });
      messages.push({
        role: "tool",
        content: result.result,
        toolCallId: call.id,
      });

      if (options.outputFormat === "stream-json") {
        console.log(
          JSON.stringify({
            type: "tool_call",
            name: call.name,
            arguments: call.arguments,
            result: result.result,
            isError: result.isError,
          }),
        );
      }
    }
  }

  const duration = (Date.now() - startTime) / 1000;

  return {
    response: fullResponse,
    toolCalls: toolCallsRecord,
    stats: {
      duration,
      toolCallsCount: toolCallsRecord.length,
    },
  };
}

export function outputResult(
  result: HeadlessResult,
  format: "text" | "json" | "stream-json",
): void {
  switch (format) {
    case "json":
      console.log(JSON.stringify(result, null, 2));
      break;

    case "stream-json":
      console.log(
        JSON.stringify({
          type: "response",
          response: result.response,
          stats: result.stats,
        }),
      );
      break;

    case "text":
    default:
      console.log(result.response);
      break;
  }
}
