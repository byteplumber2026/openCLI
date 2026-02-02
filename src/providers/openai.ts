// src/providers/openai.ts
import OpenAI from 'openai';
import type { Provider, Message, ChatOptions, StreamChunk, Model } from './types.js';

const MODELS: Model[] = [
  { id: 'gpt-4o', name: 'GPT-4o', contextWindow: 128000 },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', contextWindow: 128000 },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', contextWindow: 128000 },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', contextWindow: 16385 },
];

export class OpenAIProvider implements Provider {
  readonly name = 'openai';
  readonly envVar = 'OPENAI_API_KEY';
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
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
      model: 'gpt-4o',
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
