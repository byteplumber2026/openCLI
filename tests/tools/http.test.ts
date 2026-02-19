import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { httpRequest } from "../../src/tools/http.js";

describe("httpRequest", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("makes a GET request", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      statusText: "OK",
      headers: new Headers({ "content-type": "application/json" }),
      text: () => Promise.resolve('{"name": "test"}'),
    });

    const result = await httpRequest({
      method: "GET",
      url: "https://api.example.com/test",
    });

    expect(result).toContain("Status: 200 OK");
    expect(result).toContain('{"name": "test"}');
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.example.com/test",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("makes a POST request with body", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 201,
      statusText: "Created",
      headers: new Headers(),
      text: () => Promise.resolve('{"id": 1}'),
    });

    await httpRequest({
      method: "POST",
      url: "https://api.example.com/test",
      body: { name: "test" },
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.example.com/test",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "test" }),
      }),
    );
  });

  it("makes a PUT request with body", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      statusText: "OK",
      headers: new Headers(),
      text: () => Promise.resolve('{"updated": true}'),
    });

    await httpRequest({
      method: "PUT",
      url: "https://api.example.com/test/1",
      body: { name: "updated" },
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.example.com/test/1",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ name: "updated" }),
      }),
    );
  });

  it("makes a DELETE request", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 204,
      statusText: "No Content",
      headers: new Headers(),
      text: () => Promise.resolve(""),
    });

    const result = await httpRequest({
      method: "DELETE",
      url: "https://api.example.com/test/1",
    });

    expect(result).toContain("Status: 204 No Content");
  });

  it("makes a PATCH request with body", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      statusText: "OK",
      headers: new Headers(),
      text: () => Promise.resolve('{"patched": true}'),
    });

    await httpRequest({
      method: "PATCH",
      url: "https://api.example.com/test/1",
      body: { field: "value" },
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.example.com/test/1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ field: "value" }),
      }),
    );
  });

  it("passes custom headers", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      statusText: "OK",
      headers: new Headers(),
      text: () => Promise.resolve("ok"),
    });

    await httpRequest({
      method: "GET",
      url: "https://api.example.com/test",
      headers: { Authorization: "Bearer token123" },
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.example.com/test",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer token123",
        }),
      }),
    );
  });

  it("rejects invalid URLs", async () => {
    await expect(
      httpRequest({ method: "GET", url: "not-a-url" }),
    ).rejects.toThrow("Invalid URL");
  });

  it("rejects non-http(s) protocols", async () => {
    await expect(
      httpRequest({ method: "GET", url: "file:///etc/passwd" }),
    ).rejects.toThrow("Unsupported protocol");
  });

  it("truncates large responses", async () => {
    const largeBody = "x".repeat(100000);
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      statusText: "OK",
      headers: new Headers(),
      text: () => Promise.resolve(largeBody),
    });

    const result = await httpRequest({
      method: "GET",
      url: "https://example.com",
    });

    expect(result).toContain("truncated");
    expect(result.length).toBeLessThan(60000);
  });

  it("throws on timeout", async () => {
    global.fetch = vi.fn().mockImplementation(() => {
      const error = new Error("Aborted");
      error.name = "AbortError";
      return Promise.reject(error);
    });

    await expect(
      httpRequest({ method: "GET", url: "https://example.com", timeout: 1 }),
    ).rejects.toThrow("timed out");
  });

  it("includes response headers in output", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      statusText: "OK",
      headers: new Headers({
        "content-type": "application/json",
        "x-custom-header": "custom-value",
      }),
      text: () => Promise.resolve("{}"),
    });

    const result = await httpRequest({
      method: "GET",
      url: "https://api.example.com/test",
    });

    expect(result).toContain("content-type: application/json");
    expect(result).toContain("x-custom-header: custom-value");
  });

  it("does not add body for GET requests", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      statusText: "OK",
      headers: new Headers(),
      text: () => Promise.resolve("ok"),
    });

    await httpRequest({
      method: "GET",
      url: "https://api.example.com/test",
      body: { ignored: true },
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.example.com/test",
      expect.not.objectContaining({ body: expect.anything() }),
    );
  });
});
