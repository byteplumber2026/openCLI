import type { MCPServerConfig, MCPTool, MCPTransport } from "./types.js";
import { StdioTransport } from "./transport.js";

export class MCPClient {
  private transport: MCPTransport | null = null;
  private tools: MCPTool[] = [];
  private requestId = 0;
  private pendingRequests = new Map<number, (response: unknown) => void>();

  constructor(
    private name: string,
    private config: MCPServerConfig,
  ) {}

  async connect(): Promise<void> {
    this.transport = new StdioTransport(this.config);
    this.transport.onMessage((message) => this.handleMessage(message));
    await this.transport.connect();

    // Discover tools after connecting
    await this.discoverTools();
  }

  async disconnect(): Promise<void> {
    await this.transport?.disconnect();
    this.transport = null;
    this.tools = [];
  }

  getTools(): MCPTool[] {
    return this.tools;
  }

  async executeTool(
    name: string,
    args: Record<string, unknown>,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const id = ++this.requestId;

      this.pendingRequests.set(id, (response: any) => {
        if (response.error) {
          reject(new Error(response.error.message || "Tool execution failed"));
        } else {
          resolve(JSON.stringify(response.result || response));
        }
      });

      this.transport?.send({
        jsonrpc: "2.0",
        id,
        method: "tools/call",
        params: { name, arguments: args },
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error("Tool execution timeout"));
        }
      }, 30000);
    });
  }

  private async discoverTools(): Promise<void> {
    return new Promise((resolve, reject) => {
      const id = ++this.requestId;

      this.pendingRequests.set(id, (response: any) => {
        if (response.error) {
          reject(
            new Error(response.error.message || "Failed to discover tools"),
          );
        } else {
          this.tools = (response.result?.tools || []).map((t: any) => ({
            name: `${this.name}_${t.name}`,
            description: t.description,
            parameters: t.parameters,
            serverName: this.name,
          }));
          resolve();
        }
      });

      this.transport?.send({
        jsonrpc: "2.0",
        id,
        method: "tools/list",
      });

      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error("Tool discovery timeout"));
        }
      }, 10000);
    });
  }

  private handleMessage(message: unknown): void {
    const msg = message as any;
    if (msg.id && this.pendingRequests.has(msg.id)) {
      const handler = this.pendingRequests.get(msg.id)!;
      this.pendingRequests.delete(msg.id);
      handler(msg);
    }
  }
}
