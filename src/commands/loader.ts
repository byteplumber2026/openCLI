import { readFile, readdir } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import type { CustomCommand, CustomCommandDefinition } from "./types.js";

const COMMANDS_DIR = join(homedir(), ".open-cli", "commands");

export async function loadCommands(): Promise<Map<string, CustomCommand>> {
  const commands = new Map<string, CustomCommand>();

  if (!existsSync(COMMANDS_DIR)) {
    return commands;
  }

  const files = await readdir(COMMANDS_DIR);

  for (const file of files.filter((f) => f.endsWith(".toml"))) {
    try {
      const content = await readFile(join(COMMANDS_DIR, file), "utf-8");
      const definition = parseToml(content);

      if (isValidDefinition(definition)) {
        commands.set(definition.name, {
          name: definition.name,
          description: definition.description,
          prompt: definition.prompt,
          source: join(COMMANDS_DIR, file),
        });
      }
    } catch (error) {
      console.warn(`Failed to load command from ${file}:`, error);
    }
  }

  return commands;
}

export function parseToml(content: string): Partial<CustomCommandDefinition> {
  const result: Partial<CustomCommandDefinition> = {};
  const lines = content.split("\n");
  let currentKey: string | null = null;
  let currentValue: string[] = [];
  let inMultiline = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("#") || (!trimmed && !inMultiline)) {
      continue;
    }

    if (inMultiline) {
      if (trimmed === '"""') {
        result[currentKey as keyof CustomCommandDefinition] =
          currentValue.join("\n");
        currentKey = null;
        currentValue = [];
        inMultiline = false;
      } else {
        currentValue.push(line);
      }
    } else if (trimmed.includes('"""')) {
      const match = line.match(/^([a-zA-Z_]+)\s*=\s*"""(.*)$/);
      if (match) {
        currentKey = match[1];
        const value = match[2];
        if (value.endsWith('"""')) {
          result[currentKey as keyof CustomCommandDefinition] = value.slice(
            0,
            -3,
          );
          currentKey = null;
        } else if (value) {
          currentValue = [value];
          inMultiline = true;
        } else {
          currentValue = [];
          inMultiline = true;
        }
      }
    } else {
      const match = line.match(/^([a-zA-Z_]+)\s*=\s*"([^"]*)"/);
      if (match) {
        result[match[1] as keyof CustomCommandDefinition] = match[2];
      }
    }
  }

  return result;
}

export function isValidDefinition(
  def: Partial<CustomCommandDefinition>,
): def is CustomCommandDefinition {
  return !!def.name && !!def.description && !!def.prompt;
}

export { COMMANDS_DIR };
