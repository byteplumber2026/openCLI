// tests/config/settings-mcp.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import {
  getMCPServers,
  setMCPServer,
  removeMCPServer,
} from "../../src/config/settings.js";

describe("MCP Settings", () => {
  beforeEach(() => {
    // Clean up test servers
    const servers = getMCPServers();
    Object.keys(servers).forEach((key) => removeMCPServer(key));
  });

  it("getMCPServers returns empty object by default", () => {
    const servers = getMCPServers();
    expect(servers).toEqual({});
  });

  it("setMCPServer adds server config", () => {
    setMCPServer("test-server", { command: "test", args: ["--stdio"] });
    const servers = getMCPServers();
    expect(servers["test-server"]).toBeDefined();
    expect(servers["test-server"].command).toBe("test");
  });

  it("removeMCPServer deletes server config", () => {
    setMCPServer("to-remove", { command: "test" });
    removeMCPServer("to-remove");
    const servers = getMCPServers();
    expect(servers["to-remove"]).toBeUndefined();
  });
});
