// src/providers/grok.ts
import OpenAI from 'openai';
import type { Provider, Message, ChatOptions, StreamChunk, Model } from './types.js';

const MODELS: Model[] = [
  { id: 'grok-2', name: 'Grok 2', contextWindow: 131072 },
  { id: 'grok-2-mini', name: 'Grok 2 Mini', contextWindow: 131072 },
];

export class GrokProvider implements Provider {
  readonly name = 'grok';
  readonly envVar = 'XAI_API_KEY';
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({
      apiKey,
      baseURL: 'https://api.x.ai/v1',
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
      model: 'grok-2',
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
