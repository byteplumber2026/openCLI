import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  saveSession,
  loadSession,
  listSessions,
  deleteSession,
  ensureSessionsDir,
} from "../../src/session/store.js";
import { mkdirSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const TEST_DIR = join(tmpdir(), "open-cli-session-test");

describe("Session Store", () => {
  beforeAll(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterAll(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it("saveSession creates session file", async () => {
    const messages = [{ role: "user" as const, content: "Hello" }];
    const session = await saveSession(
      "test",
      messages,
      "openai",
      "gpt-4o",
      TEST_DIR,
    );
    expect(session.tag).toBe("test");
    expect(session.messages).toEqual(messages);
  });

  it("loadSession retrieves saved session", async () => {
    const messages = [{ role: "user" as const, content: "Hello" }];
    await saveSession("load-test", messages, "openai", "gpt-4o", TEST_DIR);

    const loaded = await loadSession("load-test", TEST_DIR);
    expect(loaded).not.toBeNull();
    expect(loaded?.tag).toBe("load-test");
    expect(loaded?.messages).toEqual(messages);
  });

  it("loadSession returns null for non-existent session", async () => {
    const loaded = await loadSession("non-existent", TEST_DIR);
    expect(loaded).toBeNull();
  });

  it("listSessions returns all sessions", async () => {
    await saveSession("list-1", [], "openai", "gpt-4o", TEST_DIR);
    await saveSession("list-2", [], "gemini", "gemini-pro", TEST_DIR);

    const sessions = await listSessions(TEST_DIR);
    expect(sessions.length).toBeGreaterThanOrEqual(2);
    expect(sessions.some((s) => s.tag === "list-1")).toBe(true);
    expect(sessions.some((s) => s.tag === "list-2")).toBe(true);
  });

  it("deleteSession removes session file", async () => {
    await saveSession("delete-me", [], "openai", "gpt-4o", TEST_DIR);

    const deleted = await deleteSession("delete-me", TEST_DIR);
    expect(deleted).toBe(true);

    const loaded = await loadSession("delete-me", TEST_DIR);
    expect(loaded).toBeNull();
  });

  it("deleteSession returns false for non-existent session", async () => {
    const deleted = await deleteSession("non-existent", TEST_DIR);
    expect(deleted).toBe(false);
  });
});
