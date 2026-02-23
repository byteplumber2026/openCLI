# Open-CLI

A powerful multi-provider AI terminal assistant with built-in tools, session management, and extensibility.

## Features

- **Multi-Provider Support**: OpenAI, Google Gemini, xAI Grok, Minimax, DeepSeek, and OpenRouter (15 curated models)
- **Interactive Chat**: Rich terminal interface with syntax highlighting
- **Built-in Tools**:
  - Shell command execution
  - File reading, writing, and editing
  - Web search (Brave API)
  - HTTP requests
- **Headless Mode**: Use in CI/CD pipelines with `-p` flag
- **Session Management**: Save, resume, and share conversations
- **MCP Server Support**: Connect to Model Context Protocol servers for extended capabilities
- **Custom Commands**: Define your own slash commands in TOML
- **Skills**: Reusable AI instruction sets in markdown, loaded automatically per-project
- **AGENTS.md Context**: Hierarchical context files for project-specific instructions
- **Enhanced @ Files**: Include directories, glob patterns, git-aware filtering
- **Shell Passthrough**: Execute shell commands directly with `!` prefix
- **Token Tracking**: Accurate token counting and cost estimation
- **Structured Logging**: Debug with `--verbose` or `--debug` flags

## Installation

```bash
npm install -g opencli
```

Or run directly:

```bash
npx opencli
```

## Quick Start

```bash
# Set at least one API key
export OPENAI_API_KEY=sk-...
# or
export GOOGLE_API_KEY=AI...
# or
export XAI_API_KEY=x...
# or
export MINIMAX_API_KEY=...
# or
export DEEPSEEK_API_KEY=sk-...
# or
export OPENROUTER_API_KEY=sk-or-...

# Start interactive chat
opencli

# Or run a single prompt
opencli -p "Explain what this codebase does"
```

## Usage

### Interactive Mode

```bash
opencli
```

Commands available in chat:

- `/help` - Show help message
- `/models` - Switch model
- `/provider` - Switch provider
- `/skills` - List loaded skills
- `/skill:<name>` - Invoke a skill for the current message
- `/stats` - Show session statistics
- `/copy` - Copy last response to clipboard
- `/clear` - Clear conversation history
- `/exit` - Exit the application

### Session Management

```bash
/chat save <tag>      # Save current conversation
/chat list           # List saved sessions
/chat resume <tag>   # Resume a saved session
/chat delete <tag>   # Delete a saved session
/chat share [tag]    # Export session to markdown
```

### File Context

```bash
@file.ts           # Include single file
@src/              # Include all files in directory
@src/**/*.ts       # Include files matching glob pattern
```

### Shell Passthrough

```bash
!ls -la           # Execute shell command
!                 # Toggle shell mode
```

### Headless Mode

```bash
# Single prompt, exit after response
opencli -p "Explain this codebase"

# JSON output for parsing
opencli -p "List all TODOs" --output-format json

# Stream JSON events
opencli -p "Run tests" --output-format stream-json
```

### MCP Servers

Configure MCP servers in `~/.open-cli/settings.json`:

```json
{
  "mcpServers": {
    "github": {
      "command": "mcp-server-github",
      "env": { "GITHUB_TOKEN": "$GITHUB_TOKEN" }
    }
  }
}
```

Commands:

- `/mcp` - List MCP servers and tools
- `/mcp refresh` - Reconnect to MCP servers

### Custom Commands

Create custom commands in `~/.open-cli/commands/` as TOML files:

```toml
# ~/.open-cli/commands/review.toml
name = "review"
description = "Review code for issues"
prompt = """
Review this code for bugs, security issues, and improvements:

@{{args}}

Focus on:
- Logic errors
- Security vulnerabilities
- Performance issues
"""
```

Usage:

```bash
/review src/index.ts
```

### Skills

Skills are markdown files that inject reusable AI instructions into the system prompt. Define them globally or per-project.

```markdown
# ~/.open-cli/skills/code-review.md
---
name: code-review
description: Reviews code for bugs, security issues, and style
---

You are an expert code reviewer. When reviewing code:
- Check for security vulnerabilities
- Look for performance issues
- Suggest idiomatic improvements
```

Skills are loaded from two locations (project-local overrides global on conflict):

- `~/.open-cli/skills/` — global skills, always available
- `.opencli/skills/` — project-local skills, checked into your repo

Commands:

```bash
/skills                  # List all loaded skills
/skills reload           # Reload skills from disk
/skill:code-review       # Activate skill for next message
/skill:code-review <msg> # Invoke skill and send message in one go
```

The AI also sees all skill names and descriptions automatically and can apply them proactively.

### AGENTS.md Context

Create context files for project-specific instructions:

- `~/.open-cli/AGENTS.md` - Global user context
- `<project>/AGENTS.md` - Project context
- `<subdir>/AGENTS.md` - JIT context for specific directories

Commands:

- `/memory show` - Display loaded context
- `/memory add <text>` - Add to global AGENTS.md
- `/memory refresh` - Reload all context files
- `/memory list` - List AGENTS.md files being used

## Configuration

Settings are stored in `~/.open-cli/settings.json`:

```json
{
  "defaultProvider": "openai",
  "defaultModel": "gpt-4o",
  "preferences": {
    "temperature": 0.7
  },
  "styles": {
    "promptColor": "cyan",
    "codeTheme": "monokai"
  },
  "mcpServers": {}
}
```

## Environment Variables

| Provider     | Environment Variable |
| ------------ | -------------------- |
| OpenAI       | `OPENAI_API_KEY`     |
| Gemini       | `GOOGLE_API_KEY`     |
| Grok         | `XAI_API_KEY`        |
| Minimax      | `MINIMAX_API_KEY`    |
| DeepSeek     | `DEEPSEEK_API_KEY`   |
| OpenRouter   | `OPENROUTER_API_KEY` |
| Brave Search | `BRAVE_API_KEY`      |

## Options

| Flag                  | Description                                     |
| --------------------- | ----------------------------------------------- |
| `-p, --prompt <text>` | Run in headless mode with a single prompt       |
| `--provider <name>`   | Provider to use (openai, gemini, grok, minimax, deepseek, openrouter) |
| `-m, --model <id>`    | Model to use                                    |
| `-o, --output-format` | Output format (text, json, stream-json)         |
| `--verbose`           | Enable info-level logging                       |
| `--debug`             | Enable debug-level logging                      |

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build
npm run build

# Run tests
npm test

# Lint
npm run lint
```

## License

MIT
