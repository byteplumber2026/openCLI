// tests/config/settings-path.test.ts
import { describe, it, expect } from "vitest";
import { existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { config, ensureSettingsFile } from "../../src/config/settings.js";

describe("Settings file location", () => {
  it("config file path is at ~/.open-cli/settings.json", () => {
    const expectedPath = join(homedir(), ".open-cli", "settings.json");
    expect(config.path).toBe(expectedPath);
  });

  it("ensureSettingsFile creates the file if it doesn't exist", () => {
    ensureSettingsFile();
    const settingsPath = join(homedir(), ".open-cli", "settings.json");
    expect(existsSync(settingsPath)).toBe(true);
  });
});
