import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type {
  Provider,
  Message,
  StreamChunk,
} from "../../src/providers/types.js";
import { runHeadless, outputResult } from "../../src/cli/headless.js";
import * as toolsModule from "../../src/tools/index.js";

const createMockProvider = (
  responses: string[],
  toolCalls?: any[],
): Provider => {
  let callIndex = 0;
  let toolCallIndex = 0;

  return {
    name: "mock",
    envVar: "MOCK_KEY",
    validateApiKey: async () => true,
    listModels: () => [
      { id: "mock-model", name: "Mock Model", contextWindow: 4096 },
    ],
    chat: vi.fn(async function* (
      _messages: Message[],
      _options?: any,
    ): AsyncGenerator<StreamChunk> {
      const response = responses[callIndex] || "";
      const tools = toolCalls?.[toolCallIndex];
      callIndex++;
      toolCallIndex++;

      yield { content: response, done: true, toolCalls: tools };
    }),
  };
};

interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

describe("runHeadless", () => {
  const originalExit = process.exit;

  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    process.exit = vi.fn() as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.exit = originalExit;
  });

  it("returns response from provider", async () => {
    const provider = createMockProvider(["Hello, I am your assistant."]);
    const result = await runHeadless(provider, "mock-model", {
      prompt: "Hello",
      outputFormat: "text",
    });

    expect(result.response).toBe("Hello, I am your assistant.");
    expect(result.toolCalls).toHaveLength(0);
    expect(result.stats.duration).toBeGreaterThanOrEqual(0);
  });

  it("executes tool calls and returns final response", async () => {
    const executeToolSpy = vi
      .spyOn(toolsModule, "executeTool")
      .mockResolvedValue({
        id: "1",
        result: "file contents here",
      });

    const provider = createMockProvider(
      ["I'll check that file.", "The file contains test data."],
      [[{ id: "1", name: "file_read", arguments: { path: "test.txt" } }]],
    );

    const result = await runHeadless(provider, "mock-model", {
      prompt: "Read test.txt",
      outputFormat: "text",
    });

    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls[0].name).toBe("file_read");
    expect(result.stats.toolCallsCount).toBe(1);

    executeToolSpy.mockRestore();
  });

  it("exits with error on provider failure", async () => {
    const errorProvider: Provider = {
      name: "error",
      envVar: "ERROR_KEY",
      validateApiKey: async () => true,
      listModels: () => [
        { id: "error-model", name: "Error Model", contextWindow: 4096 },
      ],
      chat: async function* () {
        throw new Error("API error");
      },
    };

    await runHeadless(errorProvider, "error-model", {
      prompt: "Hello",
      outputFormat: "text",
    });

    expect(process.exit).toHaveBeenCalledWith(1);
  });
});

describe("outputResult", () => {
  let consoleSpy: any;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("outputs plain text in text format", () => {
    const result = {
      response: "Hello world",
      toolCalls: [],
      stats: { duration: 1.5, toolCallsCount: 0 },
    };

    outputResult(result, "text");

    expect(consoleSpy).toHaveBeenCalledWith("Hello world");
  });

  it("outputs JSON in json format", () => {
    const result = {
      response: "Hello world",
      toolCalls: [],
      stats: { duration: 1.5, toolCallsCount: 0 },
    };

    outputResult(result, "json");

    const logged = JSON.parse(consoleSpy.mock.calls[0][0]);
    expect(logged.response).toBe("Hello world");
    expect(logged.stats.duration).toBe(1.5);
  });

  it("outputs stream-json format with type field", () => {
    const result = {
      response: "Hello world",
      toolCalls: [],
      stats: { duration: 1.5, toolCallsCount: 0 },
    };

    outputResult(result, "stream-json");

    const logged = JSON.parse(consoleSpy.mock.calls[0][0]);
    expect(logged.type).toBe("response");
    expect(logged.response).toBe("Hello world");
  });
});
