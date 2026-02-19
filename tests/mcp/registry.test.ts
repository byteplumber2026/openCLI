import { describe, it, expect, beforeEach } from "vitest";
import { MCPRegistry } from "../../src/mcp/registry.js";

describe("MCPRegistry", () => {
  let registry: MCPRegistry;

  beforeEach(() => {
    registry = new MCPRegistry();
  });

  it("starts with no tools", () => {
    expect(registry.getTools()).toEqual([]);
  });

  it("listServers returns empty array initially", () => {
    expect(registry.listServers()).toEqual([]);
  });

  it("executeTool throws for unknown tool", async () => {
    await expect(registry.executeTool("unknown", {})).rejects.toThrow(
      "Tool not found",
    );
  });
});
