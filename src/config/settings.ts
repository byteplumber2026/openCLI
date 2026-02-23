import Conf from "conf";
import { existsSync, mkdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import type { MCPServerConfig } from "../mcp/types.js";

interface OpenCliConfig {
  defaultProvider?: string;
  defaultModel?: string;
  preferences: {
    temperature: number;
  };
  styles: {
    promptColor: string;
    codeTheme: string;
  };
  logging: {
    level: string;
    file: boolean;
  };
  mcpServers: Record<string, MCPServerConfig>;
}

const defaults: OpenCliConfig = {
  preferences: {
    temperature: 0.7,
  },
  styles: {
    promptColor: "cyan",
    codeTheme: "monokai",
  },
  logging: {
    level: "silent",
    file: false,
  },
  mcpServers: {},
};

const CONFIG_DIR = join(homedir(), ".open-cli");
const CONFIG_PATH = join(CONFIG_DIR, "settings.json");

export function ensureSettingsFile(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

ensureSettingsFile();

export const config = new Conf<OpenCliConfig>({
  projectName: "open-cli",
  cwd: CONFIG_DIR,
  configName: "settings",
  defaults,
});

export function getDefaultProvider(): string | undefined {
  return config.get("defaultProvider");
}

export function setDefaultProvider(provider: string): void {
  config.set("defaultProvider", provider);
}

export function getDefaultModel(): string | undefined {
  return config.get("defaultModel");
}

export function setDefaultModel(model: string): void {
  config.set("defaultModel", model);
}

export function getStyles() {
  return config.get("styles");
}

export function setStyles(styles: Partial<OpenCliConfig["styles"]>): void {
  const current = config.get("styles");
  config.set("styles", { ...current, ...styles });
}

export function getMCPServers(): Record<string, MCPServerConfig> {
  return config.get("mcpServers") || {};
}

export function setMCPServer(
  name: string,
  serverConfig: MCPServerConfig,
): void {
  const servers = getMCPServers();
  config.set("mcpServers", { ...servers, [name]: serverConfig });
}

export function removeMCPServer(name: string): void {
  const servers = getMCPServers();
  const { [name]: _, ...rest } = servers;
  config.set("mcpServers", rest);
}

export function getLogLevel(): string {
  return config.get("logging.level") || "silent";
}
