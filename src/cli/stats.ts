import type { Message } from "../providers/types.js";

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

export function formatStats(stats: SessionStats): string {
  return [
    `Messages: ${stats.messageCount} (${stats.userMessages} user, ${stats.assistantMessages} assistant)`,
    `Tool calls: ${stats.toolCalls}`,
    `Estimated tokens: ${stats.estimatedTokens.toLocaleString()}`,
  ].join("\n");
}
