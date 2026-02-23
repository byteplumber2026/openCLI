# Skills

Skills are reusable AI instruction sets defined as markdown files. When a skill is active, its instructions are injected into the system prompt, shaping how the AI responds for that turn.

Skills work alongside [Custom Commands](./custom-commands.md): custom commands inject a prompt template as a user message, while skills inject instructions into the system prompt.

---

## Creating a Skill

Each skill is a `.md` file with a YAML frontmatter block containing `name` and `description`, followed by the instruction body:

```markdown
---
name: code-review
description: Reviews code for bugs, security issues, and style
---

You are an expert code reviewer. When the user asks you to review code:

- Check for security vulnerabilities (injection, auth issues, exposed secrets)
- Look for logic errors and edge cases
- Identify performance bottlenecks
- Suggest idiomatic improvements for the language
- Be specific: reference line numbers and explain why each issue matters
```

### Required frontmatter fields

| Field | Description |
|---|---|
| `name` | Identifier used in `/skill:<name>` (no spaces) |
| `description` | Short description shown in `/skills` and given to the AI for auto-detection |

The body can be any markdown. It is injected verbatim into the system prompt under an `## Active Skill` heading.

---

## Where to Put Skill Files

Skills are loaded from two locations. Project-local skills override global skills when both have the same `name`.

### Global skills — always available

```
~/.open-cli/skills/
```

Place skills here when you want them available in every project.

```bash
mkdir -p ~/.open-cli/skills
```

### Project-local skills — checked into the repo

```
<project-root>/.opencli/skills/
```

Place skills here when they are specific to a project. Commit them alongside your code so the whole team benefits.

```bash
mkdir -p .opencli/skills
echo ".opencli/" >> .gitignore   # only if you don't want to share them
```

---

## Using Skills

### List loaded skills

```
> /skills

Loaded Skills:

  code-review          Reviews code for bugs, security issues, and style
    /home/user/.open-cli/skills/code-review.md
  refactor             Guides systematic refactoring
    /home/user/myproject/.opencli/skills/refactor.md
```

### Invoke a skill with a message

```
> /skill:code-review Review the authentication module
```

The skill instructions are injected into the system prompt and the AI responds immediately.

### Invoke a skill, then type your message

```
> /skill:code-review
Skill "code-review" active for next message. Type your message:
> Review src/auth.ts
```

### Reload skills after editing

```
> /skills reload
```

Rescans both skill directories without restarting.

---

## Auto-Detection

At session start, opencli appends a compact index of all skill names and descriptions to the system prompt:

```
Available skills: code-review (Reviews code for bugs and style), refactor (Guides systematic refactoring)
Apply skills proactively when the user's request matches.
```

The AI can then suggest or silently apply skills when your message matches a skill's purpose — without you needing to invoke them explicitly.

---

## Examples

### Global skill: haiku responses

```markdown
---
name: haiku
description: Responds only in haiku format (5-7-5 syllables)
---

You must respond to every message with a haiku (5-7-5 syllables). No exceptions. Do not add any prose before or after the haiku.
```

Usage:
```
> /skill:haiku What is TypeScript?
```

### Project-local skill: commit messages

```markdown
---
name: commits
description: Writes conventional commit messages for this project
---

When writing commit messages for this project, follow the Conventional Commits spec:
- Use types: feat, fix, docs, refactor, test, chore
- Scope: use module names from src/ (e.g. feat(skills):, fix(chat):)
- Keep the subject line under 72 characters
- Add a body when the change needs explanation

Example: feat(skills): add per-turn skill injection
```

Usage:
```
> /skill:commits Write a commit message for the changes in git diff
```

### Project-local skill: architecture guide

```markdown
---
name: arch
description: Answers questions about this project's architecture and conventions
---

This is the opencli project — a multi-provider CLI AI assistant in TypeScript.

Key conventions:
- All async I/O uses fs/promises, never sync variants
- Providers are in src/providers/, each implements the Provider interface
- New commands go in the switch in src/cli/commands.ts
- Tests live in tests/ mirroring the src/ structure, using vitest
- Commits follow Conventional Commits with module scopes

When answering architecture questions, reference actual file paths.
```

---

## Skill vs Custom Command

| | Skills | Custom Commands |
|---|---|---|
| Format | Markdown + frontmatter | TOML |
| Injected as | System prompt instructions | User message (prompt template) |
| Invoke | `/skill:<name>` | `/<name>` |
| Auto-applied | Yes (AI sees all skill descriptions) | No |
| Supports `{{args}}` | No | Yes |
| Best for | How to behave | What to do |

---

## Troubleshooting

**Skill not showing in `/skills`**
- Check the file ends in `.md`
- Check the frontmatter has both `name` and `description`
- Run `/skills reload` to re-scan
- Verify the file is in `~/.open-cli/skills/` or `.opencli/skills/`

**Skill not applying**
- Skills inject into the system prompt for one turn only — they do not persist across messages
- Use `/skill:<name>` before each message that needs the skill, or rely on auto-detection

**Project skill not overriding global**
- Check both files have the exact same `name` value in frontmatter
- Run `/skills reload` to re-read from disk
