// src/providers/minimax.ts
import type { Provider, Message, ChatOptions, StreamChunk, Model } from './types.js';

const MODELS: Model[] = [
  { id: 'abab6.5-chat', name: 'ABAB 6.5 Chat', contextWindow: 245760 },
  { id: 'abab5.5-chat', name: 'ABAB 5.5 Chat', contextWindow: 16384 },
];

const API_BASE = 'https://api.minimax.chat/v1';

export class MinimaxProvider implements Provider {
  readonly name = 'minimax';
  readonly envVar = 'MINIMAX_API_KEY';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  listModels(): Model[] {
    return MODELS;
  }

  async validateApiKey(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/models`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async *chat(messages: Message[], options?: ChatOptions): AsyncIterable<StreamChunk> {
    const body = {
      model: 'abab6.5-chat',
      messages: messages.map(m => ({
        role: m.role === 'user' ? 'user' : m.role === 'assistant' ? 'assistant' : 'system',
        content: m.content,
      })),
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 4096,
      stream: true,
    };

    const response = await fetch(`${API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok || !response.body) {
      throw new Error(`Minimax API error: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.startsWith('data: '));

      for (const line of lines) {
        const data = line.slice(6);
        if (data === '[DONE]') {
          yield { content: '', done: true };
          return;
        }
        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content || '';
          yield { content, done: false };
        } catch {
          // Skip malformed JSON
        }
      }
    }
  }
}
