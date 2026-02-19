import { spawn, ChildProcess } from "child_process";
import type { MCPTransport, MCPServerConfig } from "./types.js";

export class StdioTransport implements MCPTransport {
  type = "stdio" as const;
  private process: ChildProcess | null = null;
  private messageHandler: ((message: unknown) => void) | null = null;

  constructor(private config: MCPServerConfig) {}

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const { command, args = [], env = {} } = this.config;

      if (!command) {
        reject(new Error("No command specified"));
        return;
      }

      this.process = spawn(command, args, {
        env: { ...process.env, ...env },
        stdio: ["pipe", "pipe", "pipe"],
      });

      let buffer = "";

      this.process.stdout?.on("data", (data: Buffer) => {
        buffer += data.toString();
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.trim() && this.messageHandler) {
            try {
              const message = JSON.parse(line);
              this.messageHandler(message);
            } catch {
              // Ignore invalid JSON
            }
          }
        }
      });

      this.process.on("error", reject);

      // Give it a moment to start
      setTimeout(resolve, 500);
    });
  }

  async disconnect(): Promise<void> {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
  }

  async send(message: unknown): Promise<void> {
    if (!this.process?.stdin) {
      throw new Error("Transport not connected");
    }
    const line = JSON.stringify(message) + "\n";
    this.process.stdin.write(line);
  }

  onMessage(handler: (message: unknown) => void): void {
    this.messageHandler = handler;
  }
}
