# Tools

Open-CLI provides built-in tools that allow the AI to interact with your filesystem, run shell commands, search the web, and make HTTP requests.

## Overview

Tools are capabilities that the AI can use to help with your tasks. When the AI determines it needs to use a tool, it will automatically invoke it and show you the results.

```
> List all files in the src directory

[AI uses file_list tool]
[Done]
src/
  cli/
  providers/
  tools/
  config/
  context/
  session/
  mcp/
  index.ts
```

## Available Tools

### shell_run

Execute shell commands and return the output.

**Parameters:**

- `command` (required): The shell command to execute
- `workdir` (optional): Working directory

**Example:**

```
> Run the tests
```

The AI will execute shell commands as needed.

**Safety:** Commands are executed in your current shell environment with your user permissions.

### file_read

Read the contents of a file.

**Parameters:**

- `path` (required): Path to the file to read

**Example:**

```
> What's in package.json?
```

### file_write

Write content to a file (creates or overwrites).

**Parameters:**

- `path` (required): Path to the file
- `content` (required): Content to write

**Example:**

```
> Create a hello.ts file that prints hello world
```

### file_list

List files and directories in a path.

**Parameters:**

- `path` (required): Directory path to list
- `recursive` (optional): Include subdirectories

**Example:**

```
> What files are in this project?
```

### file_search

Search for a text pattern in files.

**Parameters:**

- `pattern` (required): Regex pattern to search for
- `path` (optional): Directory to search in
- `glob` (optional): File pattern (e.g., "\*.ts")

**Example:**

```
> Find all TODO comments in the code
```

### web_search

Search the web for current information.

**Parameters:**

- `query` (required): Search query
- `count` (optional): Number of results (1-10, default 5)

**Example:**

```
> What's the latest version of React?
```

**Note:** Requires `BRAVE_API_KEY` environment variable for Brave Search API.

### http_request

Make HTTP requests to URLs.

**Parameters:**

- `method` (required): HTTP method (GET, POST, PUT, DELETE, PATCH)
- `url` (required): The URL to request
- `body` (optional): JSON body for POST/PUT/PATCH
- `headers` (optional): HTTP headers as key-value pairs
- `timeout` (optional): Timeout in seconds (default 30)

**Example:**

```
> Fetch the latest commits from the GitHub API
```

## Using Tools

### Automatic Tool Use

The AI automatically determines when to use tools. You just describe what you want:

```
> Read index.ts and count how many lines it has
```

The AI will:

1. Read the file using `file_read`
2. Analyze the content
3. Provide the answer

### Shell Passthrough

Execute shell commands directly without AI assistance using the `!` prefix:

```bash
!ls -la
!git status
!npm run build
```

### Shell Mode

Enter interactive shell mode for multiple commands:

```
!
```

This enters shell mode where every line is executed as a shell command. Exit with `Ctrl+C` or type `/exit`.

**Example:**

```
> !
$ ls -la
$ npm test
$ git status
$ /exit
```

## File Context (@ Syntax)

Include files directly in your messages using the `@` prefix:

### Single File

```
> Explain what @src/index.ts does
```

### Directory

```
> What's in @src/ directory?
```

### Glob Pattern

```
> Find all @**/*.test.ts files
```

### Multiple Items

```
> Compare @README.md and @docs/guide.md
```

### Git-Aware Filtering

When including directories, Open-CLI automatically:

- Respects `.gitignore` patterns
- Excludes `node_modules`, `.git`, `dist`, etc.
- Filters hidden files

## Confirmation Prompts

For destructive operations, Open-CLI asks for confirmation:

```
> Delete all .log files

? Confirm deleting 15 files (y/N)
```

Respond with `y` or `n`.

## Tool Execution Logging

When using `--debug` flag, tool executions are logged:

```bash
opencli --debug
```

Debug output includes:

- Tool name and arguments
- Execution duration
- Result size

Example:

```
[DEBUG] tool_execution { tool: "file_read", args: { path: "src/index.ts" }, durationMs: 5, resultChars: 1234 }
```

## Listing Available Tools

View all available tools:

```
> /tools
```

For detailed descriptions:

```
> /tools desc
```
