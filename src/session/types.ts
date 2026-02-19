import type { Message } from "../providers/types.js";

export interface Session {
  id: string;
  tag: string;
  messages: Message[];
  provider: string;
  model: string;
  createdAt: string;
  updatedAt: string;
  projectHash: string;
}

export interface SessionMetadata {
  id: string;
  tag: string;
  provider: string;
  model: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}
