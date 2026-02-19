import Conf from "conf";
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
  mcpServers: {},
};

export const config = new Conf<OpenCliConfig>({
  projectName: "open-cli",
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
  delete servers[name];
  config.set("mcpServers", servers);
}
