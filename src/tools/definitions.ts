import type { ToolDefinition } from "./types.js";

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: "shell_run",
    description: "Execute a shell command and return the output",
    parameters: {
      type: "object",
      properties: {
        command: {
          type: "string",
          description: "The shell command to execute",
        },
        workdir: {
          type: "string",
          description: "Working directory (optional)",
        },
      },
      required: ["command"],
    },
  },
  {
    name: "file_read",
    description: "Read the contents of a file",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Path to the file to read" },
      },
      required: ["path"],
    },
  },
  {
    name: "file_write",
    description: "Write content to a file (creates or overwrites)",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Path to the file to write" },
        content: {
          type: "string",
          description: "Content to write to the file",
        },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "file_list",
    description: "List files and directories in a path",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Directory path to list" },
        recursive: { type: "boolean", description: "Include subdirectories" },
      },
      required: ["path"],
    },
  },
  {
    name: "file_search",
    description: "Search for a text pattern in files",
    parameters: {
      type: "object",
      properties: {
        pattern: { type: "string", description: "Regex pattern to search for" },
        path: { type: "string", description: "Directory to search in" },
        glob: { type: "string", description: 'File pattern (e.g., "*.ts")' },
      },
      required: ["pattern"],
    },
  },
  {
    name: "web_search",
    description: "Search the web for current information, news, or facts",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
        count: {
          type: "number",
          description: "Number of results (1-10, default 5)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "http_request",
    description:
      "Fetch content from a URL. Use this to retrieve and analyze webpages, APIs, or any HTTP endpoint. Returns status, headers, and body content.",
    parameters: {
      type: "object",
      properties: {
        method: {
          type: "string",
          description: "HTTP method: GET, POST, PUT, DELETE, or PATCH",
        },
        url: { type: "string", description: "The URL to request" },
        body: {
          type: "object",
          description: "JSON body for POST/PUT/PATCH requests",
        },
        headers: {
          type: "object",
          description: "HTTP headers as key-value pairs",
        },
        timeout: {
          type: "number",
          description: "Timeout in seconds (default 30)",
        },
      },
      required: ["method", "url"],
    },
  },
];
