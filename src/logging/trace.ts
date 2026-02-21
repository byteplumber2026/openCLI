import { getLogger } from "./logger.js";

export interface TraceContext {
  provider: string;
  model: string;
  messageCount: number;
  inputTokens: number;
  startMs: number;
}

export function traceRequest(
  provider: string,
  model: string,
  messageCount: number,
  inputTokens: number,
): TraceContext {
  const ctx: TraceContext = {
    provider,
    model,
    messageCount,
    inputTokens,
    startMs: Date.now(),
  };
  getLogger().debug({ ...ctx }, "api_request_start");
  return ctx;
}

export function traceResponse(
  ctx: TraceContext,
  outputTokens: number,
  toolCalls: number,
  durationMs: number,
): void {
  getLogger().info(
    {
      provider: ctx.provider,
      model: ctx.model,
      inputTokens: ctx.inputTokens,
      outputTokens,
      toolCalls,
      durationMs,
    },
    "api_request_complete",
  );
}

export function traceToolExecution(
  toolName: string,
  args: Record<string, unknown>,
  durationMs: number,
  resultSize: number,
): void {
  getLogger().info(
    { toolName, args, durationMs, resultSize },
    "tool_execution",
  );
}
