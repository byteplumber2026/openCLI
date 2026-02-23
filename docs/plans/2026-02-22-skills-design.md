# Skills Feature Design

> Goal: Let users define reusable AI instruction sets (skills) in markdown files that opencli loads and injects into the system prompt on demand or automatically.

---

## Overview

Skills are markdown files with frontmatter that teach the AI how to behave for specific tasks. They mirror the skills system in Claude Code. Users place skill files on disk; opencli loads them at session start and injects the relevant content into the system prompt when a skill is invoked.

---

## File Format

Each skill is a `.md` file with YAML-style frontmatter:

```markdown
---
name: code-review
description: Reviews code for bugs, security issues, and style
---

You are an expert code reviewer. When reviewing code, you must:
- Check for security vulnerabilities
- Look for performance issues
- Suggest idiomatic improvements
```

Fields:
- `name` — identifier used in slash commands (required)
- `description` — shown in skill list and injected into system prompt for auto-detect (required)
- Body — full markdown instructions injected into system prompt on invocation

---

## Storage

Two layers are merged at load time. Project-local skills override global skills with the same name.

```
~/.open-cli/skills/          ← global user skills (always available)
<cwd>/.opencli/skills/       ← project-local skills (override global on conflict)
```

Load order:
1. Scan `~/.open-cli/skills/*.md`
2. Scan `.opencli/skills/*.md` in the current working directory
3. Project skills overwrite global skills with the same `name`

Malformed files (missing `name` or `description`) are skipped with a warning, matching the behaviour of custom commands.

---

## Runtime Behaviour

### Auto-detect (every session)

At session start, a compact skill index is appended to the system prompt:

```
Available skills: code-review (Reviews code for bugs and style), refactor (Guides systematic refactoring)
Apply them proactively when the user's request matches.
```

The AI can then suggest or silently apply skills without the user explicitly invoking them.

### Slash invocation (per-turn)

When the user types `/skill:<name>`, the full body of that skill is prepended to the system prompt for that turn only. It does not persist to subsequent turns.

```
/skill:code-review               → invoke skill, await user message
/skill:code-review <message>     → invoke skill + send message in one go
```

---

## Commands

A new `/skills` built-in command is added alongside `/commands`, `/mcp`, etc.

| Input | Behaviour |
|---|---|
| `/skills` | List all loaded skills: name, description, source path |
| `/skills reload` | Re-scan disk and reload skills without restarting |
| `/skill:<name>` | Inject skill body into current turn's system prompt |
| `/skill:<name> <msg>` | Inject skill + send message in one turn |

---

## Error Handling

| Situation | Behaviour |
|---|---|
| Unknown skill name | Print `Unknown skill: <name>. Use /skills to list available skills.` |
| Malformed frontmatter | Warn and skip at load time |
| Skills directory missing | Silent no-op, no error |

---

## Architecture

New module: `src/skills/`

```
src/skills/
  loader.ts     — scans disk, parses frontmatter, merges global + project layers
  types.ts      — Skill interface
```

Integration points:
- `src/cli/commands.ts` — add `skills` and `skill` to `BUILTIN_COMMANDS`, handle in `handleCommand`
- `src/cli/chat.ts` — load skills at session start, inject index into system prompt, pass loaded skills into `handleCommand` for per-turn injection

---

## Non-goals

- Skills do not persist across turns (stateless by design)
- No skill chaining or composition in v1
- No remote/URL-based skill loading
