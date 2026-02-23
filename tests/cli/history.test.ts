// tests/cli/history.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { CommandHistory } from "../../src/cli/history.js";

describe("CommandHistory", () => {
  let history: CommandHistory;

  beforeEach(() => {
    history = new CommandHistory(10);
  });

  it("starts with empty history", () => {
    expect(history.getHistory()).toEqual([]);
  });

  it("adds commands to history", () => {
    history.add("hello");
    history.add("world");
    expect(history.getHistory()).toEqual(["hello", "world"]);
  });

  it("does not add duplicate consecutive commands", () => {
    history.add("hello");
    history.add("hello");
    expect(history.getHistory()).toEqual(["hello"]);
  });

  it("does not add empty commands", () => {
    history.add("");
    history.add("   ");
    expect(history.getHistory()).toEqual([]);
  });

  it("limits history to max size", () => {
    const smallHistory = new CommandHistory(3);
    smallHistory.add("a");
    smallHistory.add("b");
    smallHistory.add("c");
    smallHistory.add("d");
    expect(smallHistory.getHistory()).toEqual(["b", "c", "d"]);
  });

  describe("navigation", () => {
    it("navigateUp returns previous command", () => {
      history.add("first");
      history.add("second");
      history.add("third");

      expect(history.navigateUp()).toBe("third");
      expect(history.navigateUp()).toBe("second");
      expect(history.navigateUp()).toBe("first");
      expect(history.navigateUp()).toBe("first");
    });

    it("navigateDown returns next command", () => {
      history.add("first");
      history.add("second");
      history.add("third");

      history.navigateUp();
      history.navigateUp();
      history.navigateUp();

      expect(history.navigateDown()).toBe("second");
      expect(history.navigateDown()).toBe("third");
      expect(history.navigateDown()).toBe("");
    });

    it("resetNavigation resets position", () => {
      history.add("first");
      history.add("second");

      history.navigateUp();
      history.navigateUp();
      history.resetNavigation();

      expect(history.navigateUp()).toBe("second");
    });

    it("returns empty string when history is empty", () => {
      expect(history.navigateUp()).toBe("");
      expect(history.navigateDown()).toBe("");
    });
  });
});
