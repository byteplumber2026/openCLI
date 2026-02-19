import type { Session } from "./types.js";

export function exportToMarkdown(session: Session): string {
  const lines: string[] = [
    `# Session: ${session.tag}`,
    "",
    `- Provider: ${session.provider}`,
    `- Model: ${session.model}`,
    `- Created: ${new Date(session.createdAt).toLocaleString()}`,
    "",
    "---",
    "",
  ];

  for (const message of session.messages) {
    switch (message.role) {
      case "user":
        lines.push(`## User`, "", message.content, "");
        break;
      case "assistant":
        lines.push(`## Assistant`, "", message.content, "");
        break;
      case "tool":
        lines.push(`## Tool Result`, "", message.content.slice(0, 200), "");
        break;
    }
    lines.push("");
  }

  return lines.join("\n");
}

export function exportToJSON(session: Session): string {
  return JSON.stringify(
    {
      tag: session.tag,
      provider: session.provider,
      model: session.model,
      createdAt: session.createdAt,
      messages: session.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    },
    null,
    2,
  );
}
