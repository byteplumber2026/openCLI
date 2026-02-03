// src/providers/gemini.ts
import OpenAI from 'openai';
import type { Provider, Message, ChatOptions, StreamChunk, Model, ToolCall } from './types.js';

const MODELS: Model[] = [
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', contextWindow: 1048576 },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', contextWindow: 2097152 },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', contextWindow: 1048576 },
];

export class GeminiProvider implements Provider {
  readonly name = 'gemini';
  readonly envVar = 'GOOGLE_API_KEY';
  private client: OpenAI;
  private model: string = 'gemini-2.0-flash';

  constructor(apiKey: string) {
    this.client = new OpenAI({
      apiKey,
      baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    });
  }

  setModel(model: string): void {
    this.model = model;
  }

  listModels(): Model[] {
    return MODELS;
  }

  async validateApiKey(): Promise<boolean> {
    try {
      await this.client.models.list();
      return true;
    } catch {
      return false;
    }
  }

  async *chat(messages: Message[], options?: ChatOptions): AsyncIterable<StreamChunk> {
    const openaiMessages: OpenAI.ChatCompletionMessageParam[] = [];

    if (options?.systemPrompt) {
      openaiMessages.push({ role: 'system', content: options.systemPrompt });
    }

    for (const m of messages) {
      if (m.role === 'tool') {
        openaiMessages.push({
          role: 'tool',
          content: m.content,
          tool_call_id: m.toolCallId!,
        });
      } else if (m.role === 'assistant' && m.toolCalls) {
        openaiMessages.push({
          role: 'assistant',
          content: m.content || null,
          tool_calls: m.toolCalls.map(tc => ({
            id: tc.id,
            type: 'function' as const,
            function: { name: tc.name, arguments: JSON.stringify(tc.arguments) },
          })),
        });
      } else {
        openaiMessages.push({ role: m.role as 'user' | 'assistant' | 'system', content: m.content });
      }
    }

    const tools = options?.tools?.map(t => ({
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }));

    const stream = await this.client.chat.completions.create({
      model: this.model,
      messages: openaiMessages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens,
      tools: tools?.length ? tools : undefined,
      stream: true,
    });

    let currentToolCalls: Map<number, { id: string; name: string; arguments: string }> = new Map();

    for await (const chunk of stream) {
      const choice = chunk.choices[0];
      if (!choice) continue;

      const content = choice.delta?.content || '';
      const toolCallDeltas = choice.delta?.tool_calls;

      if (toolCallDeltas) {
        for (const tc of toolCallDeltas) {
          if (!currentToolCalls.has(tc.index)) {
            currentToolCalls.set(tc.index, { id: tc.id || '', name: tc.function?.name || '', arguments: '' });
          }
          const current = currentToolCalls.get(tc.index)!;
          if (tc.id) current.id = tc.id;
          if (tc.function?.name) current.name = tc.function.name;
          if (tc.function?.arguments) current.arguments += tc.function.arguments;
        }
      }

      const done = choice.finish_reason === 'stop' || choice.finish_reason === 'tool_calls';

      if (done && currentToolCalls.size > 0) {
        const toolCalls: ToolCall[] = Array.from(currentToolCalls.values()).map(tc => ({
          id: tc.id,
          name: tc.name,
          arguments: JSON.parse(tc.arguments || '{}'),
        }));
        yield { content, done: true, toolCalls };
      } else {
        yield { content, done };
      }
    }
  }
}
