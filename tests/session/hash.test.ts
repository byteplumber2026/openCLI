import { describe, it, expect } from "vitest";
import { getProjectHash } from "../../src/session/hash.js";

describe("getProjectHash", () => {
  it("returns consistent hash for same path", () => {
    const hash1 = getProjectHash("/home/user/myproject");
    const hash2 = getProjectHash("/home/user/myproject");
    expect(hash1).toBe(hash2);
  });

  it("returns different hash for different paths", () => {
    const hash1 = getProjectHash("/home/user/project1");
    const hash2 = getProjectHash("/home/user/project2");
    expect(hash1).not.toBe(hash2);
  });

  it("returns 12 character hash", () => {
    const hash = getProjectHash("/any/path");
    expect(hash.length).toBe(12);
  });
});
