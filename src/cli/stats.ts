import type { Message } from "../providers/types.js";
import type { UsageStats } from "../providers/usage.js";

export interface SessionStats {
  messageCount: number;
  userMessages: number;
  assistantMessages: number;
  toolCalls: number;
  estimatedTokens: number;
}

export function calculateStats(messages: Message[]): SessionStats {
  let userMessages = 0;
  let assistantMessages = 0;
  let toolCalls = 0;
  let totalContent = "";

  for (const msg of messages) {
    if (msg.role === "user") {
      userMessages++;
      totalContent += msg.content;
    } else if (msg.role === "assistant") {
      assistantMessages++;
      totalContent += msg.content;
      if (msg.toolCalls) {
        toolCalls += msg.toolCalls.length;
      }
    }
  }

  const estimatedTokens = Math.ceil(totalContent.length / 4);

  return {
    messageCount: messages.length,
    userMessages,
    assistantMessages,
    toolCalls,
    estimatedTokens,
  };
}

export function formatStats(
  stats: SessionStats,
  usage?: UsageStats,
  contextWindow?: number,
): string {
  const lines = [
    `Messages: ${stats.messageCount} (${stats.userMessages} user, ${stats.assistantMessages} assistant)`,
    `Tool calls: ${stats.toolCalls}`,
  ];

  if (usage && usage.requestCount > 0) {
    lines.push(
      `Tokens: ${usage.inputTokens.toLocaleString()} in / ${usage.outputTokens.toLocaleString()} out (${usage.totalTokens.toLocaleString()} total)`,
    );
    if (usage.estimatedCost > 0) {
      lines.push(`Cost: ~$${usage.estimatedCost.toFixed(4)}`);
    }
    if (contextWindow) {
      const pct = Math.round((usage.totalTokens / contextWindow) * 100);
      lines.push(
        `Context: ${pct}% of ${(contextWindow / 1000).toFixed(0)}K window`,
      );
    }
  } else {
    lines.push(`Estimated tokens: ${stats.estimatedTokens.toLocaleString()}`);
  }

  return lines.join("\n");
}
