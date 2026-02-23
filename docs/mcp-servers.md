# MCP Servers

MCP (Model Context Protocol) servers extend Open-CLI's capabilities by connecting to external tools and services.

## What is MCP?

MCP is a protocol that allows AI assistants to connect to external tools. Open-CLI can connect to MCP servers to access additional tools beyond the built-in ones.

## Configuration

MCP servers are configured in `~/.open-cli/settings.json`:

```json
{
  "mcpServers": {
    "server-name": {
      "command": "npx",
      "args": ["-y", "mcp-server-name"],
      "env": {
        "API_KEY": "$API_KEY"
      }
    }
  }
}
```

### Configuration Options

| Option    | Type     | Description                       |
| --------- | -------- | --------------------------------- |
| `command` | string   | The command to run                |
| `args`    | string[] | Command arguments                 |
| `url`     | string   | HTTP URL for SSE transport        |
| `env`     | object   | Environment variables             |
| `timeout` | number   | Request timeout in ms             |
| `trust`   | boolean  | Skip confirmation for this server |

## Setting Up MCP Servers

### Step 1: Create Configuration File

Edit `~/.open-cli/settings.json`:

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"]
    }
  }
}
```

### Step 2: Set Environment Variables (if needed)

For servers that require authentication:

```bash
export GITHUB_TOKEN=ghp_...
```

In the configuration, reference env vars with `$`:

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "$GITHUB_TOKEN"
      }
    }
  }
}
```

### Step 3: Restart Open-CLI

MCP servers are connected when Open-CLI starts. Restart to apply changes:

```bash
exit
opencli
```

## Available MCP Servers

### GitHub

Access GitHub repositories, issues, and pull requests.

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "$GITHUB_TOKEN"
      }
    }
  }
}
```

**Tools provided:**

- `github_create_issue`
- `github_get_issue`
- `github_list_issues`
- `github_search_repositories`
- And more...

### Filesystem

Enhanced file operations.

```bash
npm install -g @modelcontextprotocol/server-filesystem
```

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/path/to/allowed/directory"
      ]
    }
  }
}
```

### Brave Search

Web search via Brave API.

```bash
npm install -g @modelcontextprotocol/server-brave-search
```

```json
{
  "mcpServers": {
    "brave-search": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-brave-search"],
      "env": {
        "BRAVE_API_KEY": "$BRAVE_API_KEY"
      }
    }
  }
}
```

### PostgreSQL

Database operations.

```json
{
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": {
        "DATABASE_URL": "postgresql://user:pass@localhost/db"
      }
    }
  }
}
```

## Using MCP Tools

### /mcp Command

List connected MCP servers and their tools:

```
> /mcp
```

Output:

```
MCP Servers:
  github   Connected (5 tools)

MCP Tools:
  github_create_issue    [github]
  github_get_issue       [github]
  github_list_issues    [github]
  ...
```

### Using Tools in Conversation

The AI automatically uses MCP tools when appropriate:

```
> Create a GitHub issue for this bug
[AI uses github_create_issue tool]
[Done]
Created issue #42: Fix login bug
```

### Refresh Connections

Reconnect to all MCP servers:

```
> /mcp refresh
```

## Troubleshooting

### Server Won't Connect

1. Check the command exists:

   ```bash
   npx -y @modelcontextprotocol/server-github --help
   ```

2. Verify configuration syntax in settings.json

3. Check for errors with `--debug` flag:
   ```bash
   opencli --debug
   ```

### Tools Not Available

1. Verify server is connected:

   ```
   > /mcp
   ```

2. Refresh connections:

   ```
   > /mcp refresh
   ```

3. Restart Open-CLI

### Authentication Errors

1. Verify environment variables are set:

   ```bash
   echo $GITHUB_TOKEN
   ```

2. Check the token has required permissions

3. Use `$VAR` syntax in config (not `{{VAR}}`)

## Finding More MCP Servers

Search npm for MCP servers:

```bash
npm search @modelcontextprotocol/server
```

Or check the official MCP registry:
https://github.com/modelcontextprotocol/servers
