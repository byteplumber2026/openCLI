# Commands Reference

This document provides a complete reference for all slash commands available in Open-CLI.

## General Commands

### /help

Show the help message with all available commands.

```
> /help
```

### /about

Show version information and current session details.

```
> /about
```

Output example:

```
Open-CLI v1.0.0
Provider: openai (gpt-4o)
Session started: 2026-02-20 10:30:00
```

### /exit

Exit Open-CLI cleanly.

```
> /exit
```

Or press `Ctrl+C`.

### /clear

Clear conversation history. This starts a fresh conversation while keeping your current provider and model settings.

```
> /clear
```

## Provider and Model Commands

### /provider

Switch to a different AI provider. Opens an interactive picker.

```
> /provider
? Select a provider:
  ▸ openai
    gemini
    grok
    minimax
```

### /models

Switch to a different model within the current provider. Opens an interactive picker.

```
> /models
? Select a model:
  ▸ gpt-4o
    gpt-4o-mini
    gpt-4-turbo
    gpt-3.5-turbo
```

## Context and Memory Commands

### /memory

Manage AGENTS.md context files. Supports subcommands:

```
/memory show     # Display loaded context
/memory add <text>  # Add text to global AGENTS.md
/memory refresh  # Reload all context files
/memory list     # List AGENTS.md files in use
```

Examples:

```
> /memory show
> /memory add Always use TypeScript strict mode
> /memory refresh
> /memory list
```

### /file

Add a specific file to the conversation context.

```
> /file <path>
```

Example:

```
> /file src/index.ts
```

This adds the file contents to your next message without needing the `@` syntax.

## Session Management Commands

### /chat

Manage conversation sessions. Supports subcommands:

```
/chat save <tag>   # Save current conversation with a tag
/chat list         # List all saved sessions
/chat resume <tag> # Resume a saved session
/chat delete <tag> # Delete a saved session
```

Examples:

```
> /chat save my-project
> /chat list
> /chat resume my-project
> /chat delete old-session
```

See [Session Management](./session-management.md) for detailed documentation.

### /compress

Summarize the conversation history to save tokens. The AI will create a concise summary and replace the full history.

```
> /compress
```

Useful when approaching context window limits.

## Statistics and Export Commands

### /stats

Show current session statistics including message count, token usage, and cost.

```
> /stats
```

Output example:

```
Session Statistics:
Messages: 15 (8 user, 7 assistant)
Tool calls: 5
Tokens: 25,000 in / 8,500 out (33,500 total)
Cost: ~$0.095
Context: 26% of 128K window
```

### /export

Export the conversation to a file or clipboard.

```
/export md [file]     # Export as Markdown
/export json [file]   # Export as JSON
/export md            # Copy Markdown to clipboard
/export json          # Copy JSON to clipboard
```

Examples:

```
> /export md conversation.md
> /export json
> /export md
```

### /copy

Copy the last AI response to the clipboard.

```
> /copy
```

## Tools Commands

### /tools

List all available built-in tools.

```
/tools           # Brief list
/tools desc      # Detailed descriptions
```

Examples:

```
> /tools
> /tools desc
```

Output example (brief):

```
Built-in Tools:
  shell_run    Execute shell commands
  file_read    Read files
  file_write   Write files
  file_list    List directories
  file_search  Search files
  web_search   Search the web
  http_request Make HTTP requests
```

## MCP Commands

### /mcp

Manage MCP (Model Context Protocol) servers.

```
/mcp              # List connected servers and tools
/mcp refresh      # Reconnect to all MCP servers
```

Examples:

```
> /mcp
> /mcp refresh
```

See [MCP Servers](./mcp-servers.md) for detailed documentation.

## Custom Commands

### /commands

Manage custom commands defined in TOML files.

```
/commands list     # List available custom commands
/commands reload   # Reload custom command files
```

Examples:

```
> /commands list
> /commands reload
```

See [Custom Commands](./custom-commands.md) for creating your own commands.

### /<custom>

Execute a custom command by name.

```
> /review src/index.ts
> /test
> /deploy production
```

The command must be defined in `~/.open-cli/commands/` as a TOML file.

## Appearance Commands

### /styles

Change the terminal color theme.

```
> /styles
? Select a color theme:
  ▸ default
    green
    blue
    magenta
    cyan
    ...
```

Available themes: default, green, blue, magenta, cyan, yellow, white, gray, red, black.

## Inline Syntax

### @ File Reference

Include files directly in your message:

```
> What does @src/index.ts do?
> Read @package.json and explain the dependencies
```

See [Tools](./tools.md) for more details.

### ! Shell Command

Execute shell commands directly:

```
!ls -la
!git status
!npm test
```

Or toggle shell mode for continuous command execution:

```
!         # Enters shell mode (exit with Ctrl+C or /exit)
```

See [Tools](./tools.md) for more details.

## Keyboard Shortcuts

| Shortcut                 | Action          |
| ------------------------ | --------------- |
| `Ctrl+C`                 | Exit Open-CLI   |
| `Enter`                  | Send message    |
| `Ctrl+C` (in shell mode) | Exit shell mode |

## Command Autocomplete

Commands support partial matching. For example:

- `/m` → expands to `/models`
- `/p` → expands to `/provider`
- `/c` → shows matching commands (`/chat`, `/compress`, `/commands`, `/copy`)
