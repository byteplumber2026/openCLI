import { encodingForModel } from "js-tiktoken";
import type { Message } from "./types.js";

export const MODEL_PRICING: Record<string, { input: number; output: number }> =
  {
    "gpt-4o": { input: 2.5, output: 10 },
    "gpt-4o-mini": { input: 0.15, output: 0.6 },
    "gpt-4-turbo": { input: 10, output: 30 },
    "gpt-3.5-turbo": { input: 0.5, output: 1.5 },
    "gemini-2.0-flash": { input: 0.1, output: 0.4 },
    "gemini-1.5-pro": { input: 1.25, output: 5 },
    "gemini-1.5-flash": { input: 0.075, output: 0.3 },
    "grok-2": { input: 2, output: 10 },
    "grok-2-mini": { input: 0.3, output: 0.5 },
  };

const TIKTOKEN_MODELS = new Set([
  "gpt-4o",
  "gpt-4o-mini",
  "gpt-4-turbo",
  "gpt-3.5-turbo",
]);

let encoder: ReturnType<typeof encodingForModel> | null = null;

function getEncoder() {
  if (!encoder) {
    encoder = encodingForModel("gpt-4o" as any);
  }
  return encoder;
}

export function countTokens(text: string, model: string): number {
  if (!text) return 0;

  if (TIKTOKEN_MODELS.has(model)) {
    return getEncoder().encode(text).length;
  }

  return Math.ceil(text.length / 4);
}

const MESSAGE_OVERHEAD = 4;

export function countMessageTokens(messages: Message[], model: string): number {
  let total = 0;
  for (const msg of messages) {
    total += countTokens(msg.content, model) + MESSAGE_OVERHEAD;
  }
  return total;
}

export function estimateCost(
  inputTokens: number,
  outputTokens: number,
  model: string,
): number {
  const pricing = MODEL_PRICING[model];
  if (!pricing) return 0;

  return (
    (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000
  );
}
