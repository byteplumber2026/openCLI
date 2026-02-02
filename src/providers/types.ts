export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface StreamChunk {
  content: string;
  done: boolean;
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
