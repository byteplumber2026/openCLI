# Configuration

Open-CLI can be configured via settings files and environment variables.

## Configuration File

Settings are stored in `~/.open-cli/settings.json`.

### Default Settings

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
  "logging": {
    "level": "silent",
    "file": false
  },
  "mcpServers": {}
}
```

## Configuration Options

### defaultProvider

The default AI provider to use.

```json
"defaultProvider": "openai"
```

Valid values: `openai`, `gemini`, `grok`, `minimax`, `deepseek`, `openrouter`

### defaultModel

The default model to use.

```json
"defaultModel": "gpt-4o"
```

### preferences

User preferences for AI behavior.

| Option        | Type   | Default | Description               |
| ------------- | ------ | ------- | ------------------------- |
| `temperature` | number | 0.7     | Response creativity (0-2) |

```json
"preferences": {
  "temperature": 0.7
}
```

Lower values (0.0-0.3) produce more focused, deterministic responses. Higher values (0.7-1.0) produce more creative, varied responses.

### styles

Terminal display customization.

| Option        | Type   | Default   | Description               |
| ------------- | ------ | --------- | ------------------------- |
| `promptColor` | string | "cyan"    | Color for the prompt      |
| `codeTheme`   | string | "monokai" | Syntax highlighting theme |

**Available prompt colors:**

- default, green, blue, magenta, cyan, yellow, white, gray, red, black

**Available code themes:**

- default, monokai, github, dracula, solarized, nord

```json
"styles": {
  "promptColor": "cyan",
  "codeTheme": "monokai"
}
```

### logging

Logging configuration.

| Option  | Type    | Default  | Description         |
| ------- | ------- | -------- | ------------------- |
| `level` | string  | "silent" | Log level           |
| `file`  | boolean | false    | Enable file logging |

**Log levels:**

- `silent`: No logs
- `info`: Info level logs
- `debug`: Debug level logs (detailed)

```json
"logging": {
  "level": "debug",
  "file": true
}
```

### mcpServers

MCP server configurations. See [MCP Servers](./mcp-servers.md).

```json
"mcpServers": {
  "github": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-github"],
    "env": {
      "GITHUB_TOKEN": "$GITHUB_TOKEN"
    }
  }
}
```

## Environment Variables

### Provider API Keys

| Provider     | Variable          | Required          |
| ------------ | ----------------- | ----------------- |
| OpenAI       | `OPENAI_API_KEY`  | Yes (for OpenAI)  |
| Google       | `GOOGLE_API_KEY`  | Yes (for Gemini)  |
| xAI          | `XAI_API_KEY`     | Yes (for Grok)    |
| Minimax      | `MINIMAX_API_KEY` | Yes (for Minimax) |
| Brave Search | `BRAVE_API_KEY`   | Optional          |

### Setting Environment Variables

#### Bash/Zsh

```bash
export OPENAI_API_KEY=sk-...
```

Add to `~/.bashrc` or `~/.zshrc` for persistence:

```bash
echo 'export OPENAI_API_KEY=sk-...' >> ~/.zshrc
source ~/.zshrc
```

#### Fish

```fish
set -x OPENAI_API_KEY sk-...
```

Add to `~/.config/fish/config.fish`:

```fish
set -x OPENAI_API_KEY sk-...
```

#### Temporary (one command)

```bash
OPENAI_API_KEY=sk-... opencli -p "Hello"
```

### Other Variables

| Variable              | Description             |
| --------------------- | ----------------------- |
| `OPENCLI_CONFIG_PATH` | Custom config file path |

## Configuration Precedence

Settings are applied in this order (later overrides earlier):

1. Default values (built-in)
2. Settings file (`~/.open-cli/settings.json`)
3. Environment variables (for API keys)
4. Command-line flags

## Editing Settings

### Manual Edit

Open the settings file directly:

```bash
# macOS
open ~/.open-cli/settings.json

# Linux
xdg-open ~/.open-cli/settings.json

# Or with editor
nano ~/.open-cli/settings.json
```

### Via /styles Command

Change colors interactively:

```
> /styles
? Select a color theme:
  ▸ default
    green
    blue
    ...
```

## Directory Structure

Open-CLI creates the following directories and files:

```
~/.open-cli/
├── settings.json      # Main configuration
├── sessions/          # Saved conversations
│   └── <project-hash>/
│       └── <session>.json
├── commands/         # Custom commands
│   └── *.toml
└── AGENTS.md        # Global context file
```

## Examples

### Minimal Configuration

```json
{}
```

Uses all defaults.

### With API Key

```json
{
  "defaultProvider": "openai"
}
```

Set `OPENAI_API_KEY` environment variable.

### Full Configuration

```json
{
  "defaultProvider": "openai",
  "defaultModel": "gpt-4o",
  "preferences": {
    "temperature": 0.5
  },
  "styles": {
    "promptColor": "green",
    "codeTheme": "github"
  },
  "logging": {
    "level": "info",
    "file": false
  },
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"]
    }
  }
}
```

### Using Environment Variables for Keys

```json
{
  "defaultProvider": "openai"
}
```

```bash
# Set key in shell
export OPENAI_API_KEY=sk-...

# Or use a .env file (loaded by your shell)
```

## Troubleshooting

### Settings Not Applied

1. Check file location: `~/.open-cli/settings.json`

2. Verify JSON syntax:

   ```bash
   cat ~/.open-cli/settings.json | python3 -m json.tool
   ```

3. Restart Open-CLI after changes

### Invalid JSON

If settings.json has invalid JSON, Open-CLI will use defaults. Fix the syntax and restart.

### Environment Variable Not Found

1. Verify it's set:

   ```bash
   echo $OPENAI_API_KEY
   ```

2. Check spelling (case-sensitive)

3. For new shells, run `source ~/.zshrc` or restart terminal
