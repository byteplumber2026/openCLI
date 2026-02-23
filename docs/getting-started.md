# Getting Started with Open-CLI

Open-CLI is a powerful multi-provider AI terminal assistant that brings the power of GPT-4, Gemini, Grok, and other AI models directly to your command line.

## Installation

### Prerequisites

- Node.js 18 or later
- An API key from at least one supported provider

### Install via npm

```bash
npm install -g opencli
```

### Run without installing

```bash
npx opencli
```

## Quick Start

### 1. Set up your API key

At least one provider API key is required. Create an account and get your key from:

- **OpenAI**: https://platform.openai.com/api-keys
- **Google Gemini**: https://aistudio.google.com/app/apikey
- **xAI Grok**: https://console.x.ai
- **Minimax**: https://platform.minimaxi.com

Set the environment variable:

```bash
# OpenAI (recommended for best tool use)
export OPENAI_API_KEY=sk-...

# Google Gemini
export GOOGLE_API_KEY=AI...

# xAI Grok
export XAI_API_KEY=x...

# Minimax
export MINIMAX_API_KEY=...
```

For persistent setup, add to your shell profile (`~/.bashrc`, `~/.zshrc`, or `~/.config/fish/config.fish`):

```bash
echo 'export OPENAI_API_KEY=sk-...' >> ~/.zshrc
source ~/.zshrc
```

### 2. Start a conversation

```bash
opencli
```

You'll see the interactive prompt:

```
🤖 How can I help? (press Enter to send, Ctrl+C to exit)
>
```

Type your message and press Enter. The AI will respond with streaming text and can use tools to help with your tasks.

### 3. Try your first command

Ask something that requires file access:

```
> Read the files in this directory and summarize what this project does
```

Or ask for help:

```
> /help
```

## Running Your First Task

Here are some examples of what you can do:

### Read and understand code

```
> What does src/index.ts do?
```

### Execute shell commands

```
> List all TypeScript files in the src directory
```

### Search the web

```
> What's the latest version of Node.js?
```

### Write code

```
> Create a new file called hello.ts that prints "Hello, World!"
```

## Command Line Options

| Option                | Description                                      |
| --------------------- | ------------------------------------------------ |
| `-p, --prompt <text>` | Run in headless mode with a single prompt        |
| `--provider <name>`   | Specify provider (openai, gemini, grok, minimax) |
| `-m, --model <id>`    | Specify model                                    |
| `-o, --output-format` | Output format: text, json, or stream-json        |
| `--verbose`           | Enable info-level logging                        |
| `--debug`             | Enable debug-level logging                       |

### Examples

```bash
# Single prompt, then exit
opencli -p "Explain this codebase"

# Use a specific provider
opencli --provider gemini

# Use a specific model
opencli -m gpt-4o-mini

# JSON output for scripting
opencli -p "List all TODOs" --output-format json
```

## Next Steps

- Read [Core Concepts](./core-concepts.md) to understand providers, models, and tokens
- Explore [Commands Reference](./commands-reference.md) for all available slash commands
- Learn about [Tools](./tools.md) for file operations, shell commands, and more
- Set up [MCP Servers](./mcp-servers.md) for extended capabilities
- Configure [Custom Commands](./custom-commands.md) for your workflow
- Create [Skills](./skills.md) for reusable AI instruction sets
