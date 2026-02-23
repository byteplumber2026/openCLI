// src/providers/openrouter.ts
import OpenAI from 'openai';
import type { Provider, Message, ChatOptions, StreamChunk, Model, ToolCall } from './types.js';

const MODELS: Model[] = [
  { id: 'anthropic/claude-opus-4-5',         name: 'Claude Opus 4.5',   contextWindow: 200000  },
  { id: 'anthropic/claude-sonnet-4-5',        name: 'Claude Sonnet 4.5', contextWindow: 200000  },
  { id: 'anthropic/claude-haiku-4-5',         name: 'Claude Haiku 4.5',  contextWindow: 200000  },
  { id: 'meta-llama/llama-3.3-70b-instruct',  name: 'Llama 3.3 70B',     contextWindow: 131072  },
  { id: 'meta-llama/llama-3.1-405b-instruct', name: 'Llama 3.1 405B',    contextWindow: 131072  },
  { id: 'google/gemini-2.0-flash-001',         name: 'Gemini 2.0 Flash',  contextWindow: 1048576 },
  { id: 'google/gemini-2.5-pro-preview',       name: 'Gemini 2.5 Pro',    contextWindow: 1048576 },
  { id: 'mistralai/mistral-large-2411',        name: 'Mistral Large',     contextWindow: 131072  },
  { id: 'mistralai/codestral-2501',            name: 'Codestral',         contextWindow: 262144  },
  { id: 'deepseek/deepseek-r1',                name: 'DeepSeek R1',       contextWindow: 65536   },
  { id: 'deepseek/deepseek-chat-v3-0324',      name: 'DeepSeek V3',       contextWindow: 65536   },
  { id: 'x-ai/grok-3',                         name: 'Grok 3',            contextWindow: 131072  },
  { id: 'openai/gpt-4o',                       name: 'GPT-4o',            contextWindow: 128000  },
  { id: 'openai/o3-mini',                      name: 'o3-mini',           contextWindow: 200000  },
  { id: 'qwen/qwen-2.5-72b-instruct',          name: 'Qwen 2.5 72B',      contextWindow: 131072  },
];

export class OpenRouterProvider implements Provider {
  readonly name = 'openrouter';
  readonly envVar = 'OPENROUTER_API_KEY';
  private client: OpenAI;
  private model: string = 'anthropic/claude-sonnet-4-5';

  constructor(apiKey: string) {
    this.client = new OpenAI({
      apiKey,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': 'https://github.com/opencli',
        'X-Title': 'opencli',
      },
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

    const currentToolCalls: Map<number, { id: string; name: string; arguments: string }> = new Map();

    for await (const chunk of stream) {
      const choice = chunk.choices[0];
      if (!choice) continue;

      const content = choice.delta?.content || '';
      const toolCallDeltas = chunk.choices[0]?.delta?.tool_calls;

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
