import {
  loadHierarchicalMemory,
  formatMemoryForPrompt,
} from "../context/memory.js";
import {
  getCachedSystemPrompt,
  setCachedSystemPrompt,
} from "../context/cache.js";
import type { Skill } from "../skills/types.js";

export async function getSystemPrompt(
  skills: Map<string, Skill> = new Map(),
  activeSkillBody?: string,
): Promise<string> {
  const memories = await loadHierarchicalMemory(process.cwd());

  // Build a signature from loaded memory paths + content lengths
  const memorySig = memories
    .map((m) => `${m.path}:${m.content.length}`)
    .join("|");

  const skillsSig = [...skills.keys()].sort().join(",") + (activeSkillBody ? `:active` : "");
  const cacheSig = `${memorySig}|skills:${skillsSig}`;

  const cached = getCachedSystemPrompt(cacheSig);
  if (cached) {
    return cached;
  }

  const memorySection =
    memories.length > 0 ? formatMemoryForPrompt(memories) : "";

  const skillsIndex =
    skills.size > 0
      ? `\n## Available Skills\n${[...skills.values()]
          .map((s) => `- ${s.name}: ${s.description}`)
          .join("\n")}\nApply skills proactively when the user's request matches.`
      : "";

  const activeSkillSection = activeSkillBody
    ? `\n## Active Skill\n${activeSkillBody}`
    : "";

  const prompt = `You are a helpful coding assistant with access to tools for file and shell operations.

## Available Tools
- shell_run: Execute shell commands
- file_read: Read file contents
- file_write: Write/create files
- file_list: List directory contents
- file_search: Search for text in files
- web_search: Search the web for current information, news, or facts
- http_request: Fetch webpage content or call APIs (use GET method for URLs)

## Guidelines
1. **Read before modifying** - Always read a file before editing it
2. **Explain your actions** - Tell the user what you're about to do
3. **Use appropriate tools** - Prefer file_read over cat, file_list over ls for structured output
4. **Be cautious** - For destructive operations, explain the impact first
5. **Handle errors gracefully** - If a command fails, explain why and suggest fixes

## Working Directory
Current directory: ${process.cwd()}
${memorySection ? `\n${memorySection}\n` : ""}
When the user asks you to perform tasks, use the available tools. For reading files, modifying code, running tests, or executing commands - use the tools rather than just describing what to do.${skillsIndex}${activeSkillSection}`;

  setCachedSystemPrompt(prompt, cacheSig);
  return prompt;
}
