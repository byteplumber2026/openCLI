import pino from "pino";

export type LogLevel = "debug" | "info" | "warn" | "error" | "silent";

let logger: pino.Logger = pino({ level: "silent" });

export function createLogger(level: LogLevel): pino.Logger {
  logger = pino({
    level,
    transport:
      level !== "silent"
        ? { target: "pino/file", options: { destination: 2 } }
        : undefined,
  });
  return logger;
}

export function getLogger(): pino.Logger {
  return logger;
}

export function setLogLevel(level: LogLevel): void {
  logger.level = level;
}
