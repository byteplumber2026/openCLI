import { spawn, ChildProcess } from "child_process";
import type { MCPTransport, MCPServerConfig } from "./types.js";

const MAX_BUFFER_SIZE = 1024 * 1024; // 1MB

export class StdioTransport implements MCPTransport {
  type = "stdio" as const;
  private process: ChildProcess | null = null;
  private messageHandler: ((message: unknown) => void) | null = null;
  private dataHandler: ((data: Buffer) => void) | null = null;
  private errorHandler: ((err: Error) => void) | null = null;
  private spawnHandler: (() => void) | null = null;
  private exitHandler: ((code: number | null) => void) | null = null;

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

      this.dataHandler = (data: Buffer) => {
        buffer += data.toString();

        if (buffer.length > MAX_BUFFER_SIZE) {
          reject(new Error(`Buffer size exceeded ${MAX_BUFFER_SIZE} bytes`));
          return;
        }

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.trim() && this.messageHandler) {
            try {
              const message = JSON.parse(line);
              this.messageHandler(message);
            } catch (err) {
              console.warn("Failed to parse JSON message:", line, err);
            }
          }
        }
      };

      this.errorHandler = (err: Error) => {
        reject(err);
      };

      this.spawnHandler = () => {
        resolve();
      };

      this.exitHandler = (code: number | null) => {
        if (code !== 0 && code !== null) {
          reject(new Error(`Process exited with code ${code}`));
        }
      };

      this.process.stdout?.on("data", this.dataHandler);
      this.process.on("error", this.errorHandler);
      this.process.on("spawn", this.spawnHandler);
      this.process.on("exit", this.exitHandler);
    });
  }

  async disconnect(): Promise<void> {
    if (this.process) {
      // Remove all listeners
      if (this.dataHandler) {
        this.process.stdout?.off("data", this.dataHandler);
      }
      if (this.errorHandler) {
        this.process.off("error", this.errorHandler);
      }
      if (this.spawnHandler) {
        this.process.off("spawn", this.spawnHandler);
      }
      if (this.exitHandler) {
        this.process.off("exit", this.exitHandler);
      }

      this.process.kill();
      this.process = null;
    }
  }

  async send(message: unknown): Promise<void> {
    if (!this.process?.stdin) {
      throw new Error("Transport not connected");
    }
    const line = JSON.stringify(message) + "\n";

    return new Promise((resolve, reject) => {
      this.process!.stdin!.write(line, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  onMessage(handler: (message: unknown) => void): void {
    this.messageHandler = handler;
  }
}
