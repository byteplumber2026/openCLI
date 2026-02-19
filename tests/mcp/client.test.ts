import { describe, it, expect } from "vitest";
import { MCPClient } from "../../src/mcp/client.js";

describe("MCPClient", () => {
  it("initializes with name and config", () => {
    const client = new MCPClient("test", { command: "echo" });
    expect(client.getTools()).toEqual([]);
  });

  // Note: Full integration tests would require a mock MCP server
  // These are basic unit tests for the client structure
});
