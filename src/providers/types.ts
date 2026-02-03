export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, { type: string; description: string }>;
    required: string[];
  };
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  tools?: ToolDefinition[];
}

export interface StreamChunk {
  content: string;
  done: boolean;
  toolCalls?: ToolCall[];
}

export interface Model {
  id: string;
  name: string;
  contextWindow: number;
}

export interface Provider {
  readonly name: string;
  readonly envVar: string;
  chat(messages: Message[], options?: ChatOptions): AsyncIterable<StreamChunk>;
  listModels(): Model[];
  validateApiKey(): Promise<boolean>;
}

export interface ProviderConfig {
  apiKey: string;
  baseUrl?: string;
}
