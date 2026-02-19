import type { CustomCommand } from "./types.js";

export async function executeCustomCommand(
  command: CustomCommand,
  args: string,
): Promise<string> {
  return command.prompt.replace(/\{\{args\}\}/g, args);
}

export function formatCustomCommandPrompt(
  command: CustomCommand,
  args: string,
): string {
  return command.prompt.replace(/\{\{args\}\}/g, args);
}
