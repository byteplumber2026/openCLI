import { describe, it, expect } from "vitest";
import type { Session, SessionMetadata } from "../../src/session/types.js";

describe("Session Types", () => {
  it("Session has all required fields", () => {
    const session: Session = {
      id: "test-id",
      tag: "my-session",
      messages: [],
      provider: "openai",
      model: "gpt-4o",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      projectHash: "abc123",
    };
    expect(session.id).toBeDefined();
    expect(session.tag).toBeDefined();
    expect(session.messages).toEqual([]);
    expect(session.provider).toBeDefined();
    expect(session.model).toBeDefined();
    expect(session.createdAt).toBeDefined();
    expect(session.updatedAt).toBeDefined();
    expect(session.projectHash).toBeDefined();
  });

  it("SessionMetadata has all required fields", () => {
    const meta: SessionMetadata = {
      id: "test-id",
      tag: "my-session",
      provider: "openai",
      model: "gpt-4o",
      messageCount: 5,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(meta.id).toBeDefined();
    expect(meta.tag).toBeDefined();
    expect(meta.provider).toBeDefined();
    expect(meta.model).toBeDefined();
    expect(meta.messageCount).toBe(5);
    expect(meta.createdAt).toBeDefined();
    expect(meta.updatedAt).toBeDefined();
  });
});
