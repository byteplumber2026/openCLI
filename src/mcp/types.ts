export interface MCPServerConfig {
  command?: string;
  args?: string[];
  url?: string;
  httpUrl?: string;
  env?: Record<string, string>;
  timeout?: number;
  trust?: boolean;
}

export interface MCPTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  serverName: string;
}

export interface MCPToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  serverName: string;
}

export interface MCPToolResult {
  id: string;
  result: string;
  isError?: boolean;
}

export type MCPTransportType = "stdio" | "sse" | "http";

export interface MCPTransport {
  type: MCPTransportType;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  send(message: unknown): Promise<void>;
  onMessage(handler: (message: unknown) => void): void;
}
