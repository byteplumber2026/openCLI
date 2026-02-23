# Skills Feature Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let users define reusable AI instruction sets (skills) as `.md` files that opencli loads and injects into the system prompt on demand or automatically.

**Architecture:** A new `src/skills/` module handles loading and parsing skill files from `~/.open-cli/skills/` (global) and `.opencli/skills/` (project-local), with project skills overriding global on name conflict. At session start, all skill names+descriptions are appended to the system prompt. Users invoke skills via `/skill:<name>` to inject the full body into the current turn's system prompt.

**Tech Stack:** TypeScript, Node.js `fs/promises`, vitest for tests. No new dependencies.

---

## Task 1: Create `src/skills/types.ts`

**Files:**
- Create: `src/skills/types.ts`

**Step 1: Write the file**

```typescript
export interface Skill {
  name: string;
  description: string;
  body: string;       // full markdown content after frontmatter
  source: string;     // absolute path to the .md file
}
```

**Step 2: Commit**

```bash
git add src/skills/types.ts
git commit -m "feat(skills): add Skill type"
```

---

## Task 2: Create `src/skills/loader.ts` with tests

**Files:**
- Create: `src/skills/loader.ts`
- Create: `tests/skills/loader.test.ts`

### Step 1: Write the failing tests

Create `tests/skills/loader.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { parseFrontmatter, loadSkillsFromDir, loadSkills } from "../../src/skills/loader.js";

const TMP = join(tmpdir(), "opencli-skills-test");

beforeEach(async () => {
  await mkdir(TMP, { recursive: true });
});

afterEach(async () => {
  await rm(TMP, { recursive: true, force: true });
});

describe("parseFrontmatter", () => {
  it("parses name and description from frontmatter", () => {
    const content = `---
name: code-review
description: Reviews code for bugs
---

You are a code reviewer.`;
    const result = parseFrontmatter(content);
    expect(result.name).toBe("code-review");
    expect(result.description).toBe("Reviews code for bugs");
    expect(result.body).toBe("You are a code reviewer.");
  });

  it("returns null when name is missing", () => {
    const content = `---
description: Reviews code
---

Body.`;
    expect(parseFrontmatter(content)).toBeNull();
  });

  it("returns null when description is missing", () => {
    const content = `---
name: review
---

Body.`;
    expect(parseFrontmatter(content)).toBeNull();
  });

  it("returns null when there is no frontmatter", () => {
    const content = `Just plain text with no frontmatter.`;
    expect(parseFrontmatter(content)).toBeNull();
  });

  it("trims body whitespace", () => {
    const content = `---
name: test
description: A test skill
---

  Body with leading space.  `;
    const result = parseFrontmatter(content);
    expect(result?.body).toBe("Body with leading space.");
  });
});

describe("loadSkillsFromDir", () => {
  it("loads valid skill files from a directory", async () => {
    await writeFile(
      join(TMP, "review.md"),
      `---\nname: review\ndescription: Code review\n---\n\nReview instructions.`,
    );
    const skills = await loadSkillsFromDir(TMP);
    expect(skills.size).toBe(1);
    expect(skills.get("review")?.description).toBe("Code review");
    expect(skills.get("review")?.body).toBe("Review instructions.");
  });

  it("skips files with missing frontmatter fields", async () => {
    await writeFile(join(TMP, "bad.md"), `---\nname: bad\n---\n\nNo description.`);
    const skills = await loadSkillsFromDir(TMP);
    expect(skills.size).toBe(0);
  });

  it("ignores non-.md files", async () => {
    await writeFile(join(TMP, "review.txt"), `Some text`);
    const skills = await loadSkillsFromDir(TMP);
    expect(skills.size).toBe(0);
  });

  it("returns empty map when directory does not exist", async () => {
    const skills = await loadSkillsFromDir("/nonexistent/path");
    expect(skills.size).toBe(0);
  });
});

describe("loadSkills (merge)", () => {
  it("merges global and project skills, project wins on conflict", async () => {
    const globalDir = join(TMP, "global");
    const projectDir = join(TMP, "project");
    await mkdir(globalDir, { recursive: true });
    await mkdir(projectDir, { recursive: true });

    await writeFile(
      join(globalDir, "review.md"),
      `---\nname: review\ndescription: Global review\n---\n\nGlobal body.`,
    );
    await writeFile(
      join(projectDir, "review.md"),
      `---\nname: review\ndescription: Project review\n---\n\nProject body.`,
    );
    await writeFile(
      join(globalDir, "refactor.md"),
      `---\nname: refactor\ndescription: Refactor skill\n---\n\nRefactor body.`,
    );

    const skills = await loadSkills(globalDir, projectDir);
    expect(skills.size).toBe(2);
    expect(skills.get("review")?.description).toBe("Project review");
    expect(skills.get("refactor")?.description).toBe("Refactor skill");
  });
});
```

### Step 2: Run tests to verify they fail

```bash
npx vitest run tests/skills/loader.test.ts
```

Expected: FAIL — `loadSkills`, `loadSkillsFromDir`, `parseFrontmatter` not found.

### Step 3: Implement `src/skills/loader.ts`

```typescript
import { readFile, readdir } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import type { Skill } from "./types.js";

export const GLOBAL_SKILLS_DIR = join(homedir(), ".open-cli", "skills");
export const PROJECT_SKILLS_DIR = join(process.cwd(), ".opencli", "skills");

export interface ParsedSkill {
  name: string;
  description: string;
  body: string;
}

export function parseFrontmatter(content: string): ParsedSkill | null {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return null;

  const frontmatter = match[1];
  const body = match[2].trim();

  const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
  const descMatch = frontmatter.match(/^description:\s*(.+)$/m);

  if (!nameMatch || !descMatch) return null;

  return {
    name: nameMatch[1].trim(),
    description: descMatch[1].trim(),
    body,
  };
}

export async function loadSkillsFromDir(dir: string): Promise<Map<string, Skill>> {
  const skills = new Map<string, Skill>();

  if (!existsSync(dir)) return skills;

  const files = await readdir(dir);

  for (const file of files.filter((f) => f.endsWith(".md"))) {
    try {
      const filePath = join(dir, file);
      const content = await readFile(filePath, "utf-8");
      const parsed = parseFrontmatter(content);

      if (!parsed) {
        console.warn(`[skills] Skipping ${file}: missing name or description in frontmatter`);
        continue;
      }

      skills.set(parsed.name, {
        name: parsed.name,
        description: parsed.description,
        body: parsed.body,
        source: filePath,
      });
    } catch (error) {
      console.warn(`[skills] Failed to load ${file}:`, error);
    }
  }

  return skills;
}

export async function loadSkills(
  globalDir = GLOBAL_SKILLS_DIR,
  projectDir = PROJECT_SKILLS_DIR,
): Promise<Map<string, Skill>> {
  const global = await loadSkillsFromDir(globalDir);
  const project = await loadSkillsFromDir(projectDir);

  // Merge: project overrides global on conflict
  return new Map([...global, ...project]);
}
```

### Step 4: Run tests to verify they pass

```bash
npx vitest run tests/skills/loader.test.ts
```

Expected: All PASS.

### Step 5: Commit

```bash
git add src/skills/loader.ts src/skills/types.ts tests/skills/loader.test.ts
git commit -m "feat(skills): add skill loader with frontmatter parsing"
```

---

## Task 3: Inject skill index into system prompt

**Files:**
- Modify: `src/tools/systemPrompt.ts`

The skill index is a one-liner appended to the system prompt so the AI knows what skills are available and can proactively apply them.

**Step 1: Modify `getSystemPrompt` to accept optional skills**

In `src/tools/systemPrompt.ts`, change the signature and add the skills section:

```typescript
import type { Skill } from "../skills/types.js";

export async function getSystemPrompt(
  skills: Map<string, Skill> = new Map(),
  activeSkillBody?: string,
): Promise<string> {
```

Inside the function, build two new sections and append them to the prompt string. Add this after the `memorySection` line:

```typescript
  // Build skills index (always shown so AI can auto-suggest)
  const skillsIndex =
    skills.size > 0
      ? `\n## Available Skills\n${[...skills.values()]
          .map((s) => `- ${s.name}: ${s.description}`)
          .join("\n")}\nApply skills proactively when the user's request matches.`
      : "";

  // Active skill body (injected for this turn only via /skill:<name>)
  const activeSkillSection = activeSkillBody
    ? `\n## Active Skill\n${activeSkillBody}`
    : "";
```

Then append both to the `prompt` template string, before the final closing backtick:

```typescript
${skillsIndex}${activeSkillSection}
```

Also update the cache signature to include skills:

```typescript
  const memorySig = memories
    .map((m) => `${m.path}:${m.content.length}`)
    .join("|");
  const skillsSig = [...skills.keys()].sort().join(",") + (activeSkillBody ? `:active` : "");
  const cacheSig = `${memorySig}|skills:${skillsSig}`;

  const cached = getCachedSystemPrompt(cacheSig);
  if (cached) return cached;
  // ...
  setCachedSystemPrompt(prompt, cacheSig);
```

**Step 2: Update callers in `src/cli/chat.ts` and `src/cli/headless.ts`**

In `src/cli/chat.ts`, the `chatWithTools` function currently calls `getSystemPrompt()` with no args. Change its signature to accept skills and activeSkillBody:

```typescript
async function chatWithTools(
  state: ChatState,
  skills: Map<string, Skill> = new Map(),
  activeSkillBody?: string,
): Promise<void> {
  // ...
  const systemPrompt = await getSystemPrompt(skills, activeSkillBody);
```

In `src/cli/headless.ts`, `getSystemPrompt()` is called with no args — leave it as-is (no skills in headless mode for now, the default empty map handles it).

**Step 3: Verify build passes**

```bash
npm run build 2>&1
```

Expected: Build succeeds with no errors.

**Step 4: Commit**

```bash
git add src/tools/systemPrompt.ts src/cli/chat.ts
git commit -m "feat(skills): inject skill index and active skill into system prompt"
```

---

## Task 4: Add skill commands to `src/cli/commands.ts`

**Files:**
- Modify: `src/cli/commands.ts`

**Step 1: Add `skills` to `BUILTIN_COMMANDS`**

```typescript
const BUILTIN_COMMANDS = [
  "help",
  "exit",
  "quit",
  "clear",
  "models",
  "provider",
  "memory",
  "chat",
  "mcp",
  "stats",
  "export",
  "copy",
  "about",
  "tools",
  "compress",
  "styles",
  "file",
  "commands",
  "skills",   // ← add this
];
```

**Step 2: Add `Skill` import and extend `handleCommand` signature**

At the top of the file, add:

```typescript
import type { Skill } from "../skills/types.js";
```

Change `handleCommand`'s return type to include the new `skill_invoke` action and `activeSkillBody`:

```typescript
export async function handleCommand(
  command: Command,
  state: ChatState,
  skills: Map<string, Skill> = new Map(),
): Promise<{
  action: "continue" | "exit" | "custom_command" | "skill_invoke";
  state: ChatState;
  activeSkillBody?: string;
}> {
```

**Step 3: Add `skills` case to the switch**

Add before the `default:` case:

```typescript
    case "skills": {
      const sub = command.args.trim().toLowerCase();

      if (sub === "reload") {
        // Caller handles reload; signal to re-load skills
        console.log(chalk.dim("Skills reloaded."));
        return { action: "continue", state };
      }

      if (skills.size === 0) {
        console.log(chalk.dim("No skills loaded."));
        console.log(
          chalk.dim(
            `Add .md files to ~/.open-cli/skills/ or .opencli/skills/`,
          ),
        );
        return { action: "continue", state };
      }

      console.log(chalk.bold("\nLoaded Skills:\n"));
      for (const skill of skills.values()) {
        console.log(
          `  ${chalk.cyan(skill.name.padEnd(20))} ${skill.description}`,
        );
        console.log(chalk.dim(`    ${skill.source}`));
      }
      console.log();
      return { action: "continue", state };
    }
```

**Step 4: Handle `/skill:<name>` in the `default:` case**

The `parseCommand` function splits on the first space, so `/skill:review` gives `command.name = "skill:review"`. Handle this in the default case, before the custom commands lookup:

```typescript
    default: {
      // Handle /skill:<name> [optional message]
      if (cmdName.startsWith("skill:")) {
        const skillName = cmdName.slice("skill:".length);
        const skill = skills.get(skillName);

        if (!skill) {
          console.log(
            chalk.yellow(
              `Unknown skill: ${skillName}. Use /skills to list available skills.`,
            ),
          );
          return { action: "continue", state };
        }

        // If args provided, push them as user message and fire immediately
        if (command.args.trim()) {
          state.messages.push({
            role: "user",
            content: command.args.trim(),
          });
          return {
            action: "skill_invoke",
            state,
            activeSkillBody: skill.body,
          };
        }

        // No args: activate for next message
        console.log(
          chalk.dim(
            `Skill "${skill.name}" active for next message. Type your message:`,
          ),
        );
        return {
          action: "skill_invoke",
          state,
          activeSkillBody: skill.body,
        };
      }

      // Existing custom commands fallback...
      const customCommands = await loadCommands();
      // ...rest of existing default case unchanged
```

**Step 5: Update HELP_TEXT**

Add to the HELP_TEXT string:

```typescript
  /skills             List all loaded skills
  /skills reload      Reload skills from disk
  /skill:<name>       Invoke a skill for the current message
  /skill:<name> <msg> Invoke a skill and send a message in one go
```

**Step 6: Verify build**

```bash
npm run build 2>&1
```

Expected: No errors.

**Step 7: Commit**

```bash
git add src/cli/commands.ts
git commit -m "feat(skills): add /skills list and /skill:<name> commands"
```

---

## Task 5: Wire skills into the chat loop in `src/cli/chat.ts`

**Files:**
- Modify: `src/cli/chat.ts`

**Step 1: Import skill loader and types**

At the top of `src/cli/chat.ts`, add:

```typescript
import { loadSkills } from "../skills/loader.js";
import type { Skill } from "../skills/types.js";
```

**Step 2: Load skills at session start in `startChat`**

Inside `startChat`, after initializing `state`, add:

```typescript
  let loadedSkills: Map<string, Skill> = await loadSkills();

  if (loadedSkills.size > 0) {
    console.log(
      chalk.dim(
        `Loaded ${loadedSkills.size} skill${loadedSkills.size === 1 ? "" : "s"}. Use /skills to list them.`,
      ),
    );
  }
```

**Step 3: Thread skills through the command handler**

In the chat loop, pass `loadedSkills` to `handleCommand`:

```typescript
      if (isCommand(trimmed)) {
        const command = parseCommand(trimmed);
        const result = await handleCommand(command, state, loadedSkills);
        state = result.state;

        if (result.action === "exit") {
          return;
        }

        // Reload skills if requested
        if (command.name === "skills" && command.args.trim() === "reload") {
          loadedSkills = await loadSkills();
          if (loadedSkills.size > 0) {
            console.log(chalk.dim(`Loaded ${loadedSkills.size} skill(s).`));
          }
        }

        if (result.action === "custom_command") {
          await chatWithTools(state, loadedSkills);
        }

        if (result.action === "skill_invoke") {
          if (state.messages.length > 0 &&
              state.messages[state.messages.length - 1].role === "user") {
            // Message already pushed (had args), fire immediately
            await chatWithTools(state, loadedSkills, result.activeSkillBody);
          } else {
            // No args: store activeSkillBody, apply to next user message
            pendingSkillBody = result.activeSkillBody;
          }
        }

        continue;
      }
```

**Step 4: Apply pending skill body to next regular message**

Add `let pendingSkillBody: string | undefined = undefined;` near the top of `runLoop`, just before the loop:

```typescript
  const runLoop = async () => {
    let pendingSkillBody: string | undefined = undefined;

    while (true) {
      // ...existing input reading...
```

In the regular (non-command) message path, apply and clear the pending skill:

```typescript
      // Build file context
      const { context, cleanInput } = await buildFileContext(trimmed);
      const userContent = context ? `${context}\n\n${cleanInput}` : cleanInput;
      state.messages.push({ role: "user", content: userContent });

      // Apply any pending skill from /skill:<name> (no-args form)
      const skillBodyForThisTurn = pendingSkillBody;
      pendingSkillBody = undefined;

      await chatWithTools(state, loadedSkills, skillBodyForThisTurn);
```

**Step 5: Verify build**

```bash
npm run build 2>&1
```

Expected: Build succeeds.

**Step 6: Smoke test manually**

```bash
# Create a test skill
mkdir -p ~/.open-cli/skills
cat > ~/.open-cli/skills/haiku.md << 'EOF'
---
name: haiku
description: Responds only in haiku format
---

You must respond to every message with a haiku (5-7-5 syllables). No exceptions.
EOF

npm run dev
# In the chat: /skills          → should list haiku
# /skill:haiku What is TypeScript?  → should respond in haiku
```

**Step 7: Commit**

```bash
git add src/cli/chat.ts
git commit -m "feat(skills): wire skill loading and per-turn injection into chat loop"
```

---

## Task 6: Build and verify

**Step 1: Run full build**

```bash
npm run build 2>&1
```

Expected: Build succeeds.

**Step 2: Run all tests**

```bash
npx vitest run 2>&1
```

Expected: All pass including new `tests/skills/loader.test.ts`.

**Step 3: Commit if any loose changes**

```bash
git status
# If clean, nothing to do. Otherwise:
git add -A
git commit -m "feat(skills): complete skills feature implementation"
```
