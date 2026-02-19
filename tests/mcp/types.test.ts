import { describe, it, expect } from "vitest";
import type {
  MCPServerConfig,
  MCPTool,
  MCPToolCall,
} from "../../src/mcp/types.js";

describe("MCP Types", () => {
  it("MCPServerConfig accepts all transport types", () => {
    const stdioConfig: MCPServerConfig = {
      command: "mcp-server",
      args: ["--stdio"],
      env: { KEY: "value" },
    };

    const sseConfig: MCPServerConfig = {
      url: "http://localhost:3000/sse",
    };

    expect(stdioConfig.command).toBe("mcp-server");
    expect(sseConfig.url).toBe("http://localhost:3000/sse");
  });

  it("MCPTool has required fields", () => {
    const tool: MCPTool = {
      name: "read_file",
      description: "Read a file",
      parameters: { type: "object", properties: {} },
      serverName: "filesystem",
    };
    expect(tool.serverName).toBe("filesystem");
  });

  it("MCPToolCall references server", () => {
    const call: MCPToolCall = {
      id: "1",
      name: "read_file",
      arguments: { path: "/tmp/test" },
      serverName: "filesystem",
    };
    expect(call.serverName).toBe("filesystem");
  });
});
