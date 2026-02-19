import { describe, it, expect } from "vitest";
import { StdioTransport } from "../../src/mcp/transport.js";

describe("StdioTransport", () => {
  it("requires command to connect", async () => {
    const transport = new StdioTransport({});
    await expect(transport.connect()).rejects.toThrow("No command specified");
  });

  it("can send message after connect", async () => {
    // Using echo as a simple test
    const transport = new StdioTransport({ command: "cat" });

    const messages: unknown[] = [];
    transport.onMessage((msg) => messages.push(msg));

    await transport.connect();
    await transport.send({ test: true });
    await transport.disconnect();

    // cat will echo back, but it won't be valid JSON so won't trigger handler
    expect(messages).toEqual([]);
  });
});
