import type { MCPServerConfig, MCPTool } from "./types.js";
import { MCPClient } from "./client.js";

export class MCPRegistry {
  private clients = new Map<string, MCPClient>();
  private allTools: MCPTool[] = [];

  async connectServers(
    configs: Record<string, MCPServerConfig>,
  ): Promise<void> {
    await this.disconnectAll();

    for (const [name, config] of Object.entries(configs)) {
      try {
        const client = new MCPClient(name, config);
        await client.connect();
        this.clients.set(name, client);
      } catch (error) {
        console.warn(`Failed to connect to MCP server ${name}:`, error);
      }
    }

    this.refreshTools();
  }

  async disconnectAll(): Promise<void> {
    for (const client of this.clients.values()) {
      await client.disconnect();
    }
    this.clients.clear();
    this.allTools = [];
  }

  getTools(): MCPTool[] {
    return this.allTools;
  }

  getToolDefinitions() {
    return this.allTools.map((t) => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    }));
  }

  async executeTool(
    name: string,
    args: Record<string, unknown>,
  ): Promise<string> {
    const tool = this.allTools.find((t) => t.name === name);
    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }

    const client = this.clients.get(tool.serverName);
    if (!client) {
      throw new Error(`Server not connected: ${tool.serverName}`);
    }

    return client.executeTool(name.replace(`${tool.serverName}_`, ""), args);
  }

  listServers(): {
    name: string;
    toolCount: number;
    status: "connected" | "error";
  }[] {
    return Array.from(this.clients.entries()).map(([name, client]) => ({
      name,
      toolCount: client.getTools().length,
      status: "connected",
    }));
  }

  private refreshTools(): void {
    this.allTools = [];
    for (const client of this.clients.values()) {
      this.allTools.push(...client.getTools());
    }
  }
}

export const mcpRegistry = new MCPRegistry();
