// src/providers/gemini.ts
import OpenAI from 'openai';
import type { Provider, Message, ChatOptions, StreamChunk, Model } from './types.js';

const MODELS: Model[] = [
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', contextWindow: 1048576 },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', contextWindow: 2097152 },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', contextWindow: 1048576 },
];

export class GeminiProvider implements Provider {
  readonly name = 'gemini';
  readonly envVar = 'GOOGLE_API_KEY';
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({
      apiKey,
      baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    });
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
    const systemMessages: OpenAI.ChatCompletionMessageParam[] = options?.systemPrompt
      ? [{ role: 'system', content: options.systemPrompt }]
      : [];

    const chatMessages: OpenAI.ChatCompletionMessageParam[] = messages.map(m => ({
      role: m.role,
      content: m.content,
    }));

    const stream = await this.client.chat.completions.create({
      model: 'gemini-2.0-flash',
      messages: [...systemMessages, ...chatMessages],
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      const done = chunk.choices[0]?.finish_reason === 'stop';
      yield { content, done };
    }
  }
}
