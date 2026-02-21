# Troubleshooting

This guide helps you diagnose and fix common issues with Open-CLI.

## Installation Issues

### Command Not Found

**Symptom:** `zsh: command not found: open-cli`

**Solutions:**

1. Check if npm global bin is in your PATH:

   ```bash
   npm config get prefix
   ```

2. Add to PATH (add to `~/.zshrc`):

   ```bash
   export PATH="$(npm config get prefix)/bin:$PATH"
   ```

3. Or use npx to run without installing:
   ```bash
   npx open-cli
   ```

### Permission Denied

**Symptom:** `EACCES: permission denied`

**Solution:**

```bash
# Fix npm permissions
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH="~/.npm-global/bin:$PATH"

# Or use nvm to manage Node.js
```

## Authentication Errors

### Invalid API Key

**Symptom:** `Error: Invalid API key` or `401 Unauthorized`

**Solutions:**

1. Verify your API key is correct:

   ```bash
   echo $OPENAI_API_KEY
   ```

2. Check you have an account at the provider:
   - OpenAI: https://platform.openai.com/
   - Google: https://aistudio.google.com/
   - xAI: https://console.x.ai/
   - Minimax: https://platform.minimaxi.com/

3. Ensure the key has not expired or been revoked

### Missing API Key

**Symptom:** `No API key found for provider`

**Solutions:**

1. Set the environment variable:

   ```bash
   export OPENAI_API_KEY=sk-...
   ```

2. Add to shell profile for persistence:

   ```bash
   echo 'export OPENAI_API_KEY=sk-...' >> ~/.zshrc
   source ~/.zshrc
   ```

3. Check spelling (environment variables are case-sensitive)

## Provider Issues

### Provider Not Available

**Symptom:** `No providers available` or similar

**Solutions:**

1. Set at least one API key:

   ```bash
   export OPENAI_API_KEY=sk-...
   ```

2. Check the provider name is correct:
   - `openai` not `open-ai`
   - `gemini` not `google`

3. Verify API key has access to the API:
   - OpenAI: Check API access on platform
   - Google: Enable Gemini API in Google Cloud Console

### Model Not Found

**Symptom:** `Model not found` or `Unknown model`

**Solutions:**

1. Use `/models` to see available models

2. Check the model ID is correct (case-sensitive)

3. Ensure your API tier supports the model

### Rate Limiting

**Symptom:** `429 Too Many Requests`

**Solutions:**

1. Wait and retry (automatic retry is enabled)

2. Reduce request frequency

3. Use a different model (some have higher limits)

4. Check your provider's rate limits:
   - OpenAI: https://platform.openai.com/account/limits

## Connection Issues

### Network Error

**Symptom:** `Network error`, `ECONNRESET`, `ETIMEDOUT`

**Solutions:**

1. Check your internet connection

2. Try again (automatic retry with backoff)

3. Check if a firewall is blocking the connection

4. For corporate networks, check proxy settings

5. Use `--debug` for more details:
   ```bash
   open-cli --debug
   ```

### Timeout

**Symptom:** `Request timed out`

**Solutions:**

1. Try again (may be temporary)

2. Use a simpler prompt

3. Use a faster model

## Tool Execution Issues

### File Not Found

**Symptom:** `File not found` or `ENOENT`

**Solutions:**

1. Check the file path is correct

2. Use absolute paths when possible

3. Verify file exists:
   ```bash
   ls -la path/to/file
   ```

### Permission Denied (Files)

**Symptom:** `EACCES: permission denied`

**Solutions:**

1. Check file permissions:

   ```bash
   ls -la path/to/file
   ```

2. Fix permissions if needed:
   ```bash
   chmod 644 path/to/file
   ```

### Shell Command Failed

**Symptom:** Command executes but returns error

**Solutions:**

1. Check the command works in your terminal

2. Verify working directory

3. Check for required dependencies

## Session Issues

### Session Not Found

**Symptom:** `Session not found` when using `/chat resume`

**Solutions:**

1. Check you're in the same project directory:

   ```bash
   /chat list
   ```

2. Verify the session tag is correct

3. Sessions are project-specific (check you're in the right directory)

### Can't Save Session

**Symptom:** `Invalid tag` error

**Solutions:**

1. Use only alphanumeric characters, hyphens, and underscores:
   - Good: `my-session`, `bug_fix_1`
   - Bad: `my session!`, `test@123`

## MCP Server Issues

### MCP Server Not Connecting

**Symptom:** Server shows as disconnected or tools not available

**Solutions:**

1. Verify the server command works:

   ```bash
   npx -y @modelcontextprotocol/server-github --help
   ```

2. Check configuration in `~/.open-cli/settings.json`

3. Verify required environment variables are set

4. Use `/mcp refresh` to reconnect

5. Check with `--debug` flag

### MCP Tools Not Available

**Symptom:** Server connected but tools don't appear

**Solutions:**

1. List servers and tools:

   ```
   > /mcp
   ```

2. Refresh connections:

   ```
   > /mcp refresh
   ```

3. Restart Open-CLI

## Custom Command Issues

### Command Not Found

**Symptom:** `/mycommand` not recognized

**Solutions:**

1. Check the file exists:

   ```bash
   ls ~/.open-cli/commands/
   ```

2. Verify file has `.toml` extension

3. Reload commands:

   ```
   > /commands reload
   ```

4. Check the command definition has required fields:
   - `name`
   - `description`
   - `prompt`

### Invalid TOML

**Symptom:** Command fails to load

**Solutions:**

1. Verify TOML syntax

2. Check for common issues:
   - Missing quotes
   - Unclosed triple quotes
   - Incorrect indentation

3. Validate with TOML linter

## Performance Issues

### Slow Responses

**Solutions:**

1. Use a faster model:

   ```
   > /models
   # Select gpt-4o-mini or gemini-1.5-flash
   ```

2. Reduce conversation length:

   ```
   > /compress
   ```

3. Clear old conversations:

   ```
   > /clear
   ```

4. Check network speed

### High Token Usage

**Symptom:** Warning about context window or high costs

**Solutions:**

1. Check usage:

   ```
   > /stats
   ```

2. Compress conversation:

   ```
   > /compress
   ```

3. Use smaller models for simple tasks

4. Be specific with `@file` instead of directories

## Context Window Issues

### Context Window Full

**Symptom:** `80% of context window used` warning

**Solutions:**

1. Compress the conversation:

   ```
   > /compress
   ```

2. Clear and start fresh:

   ```
   > /clear
   ```

3. Use `/stats` to see usage

4. Be more selective with `@file` includes

## Output Issues

### Garbled Output

**Symptom:** Strange characters or formatting

**Solutions:**

1. Check terminal encoding:

   ```bash
   export LANG=en_US.UTF-8
   ```

2. Try a different terminal

3. Use `--output-format json` for machine-readable output

## Debug Mode

When all else fails, run with debug output:

```bash
open-cli --debug
```

Debug mode shows:

- API request/response details
- Token usage
- Tool execution traces
- Retry attempts
- Connection status

## Getting Help

If you're still stuck:

1. Run with `--debug` and note the error
2. Check the GitHub issues
3. Try a simpler command to isolate the issue
4. Note your environment (OS, Node version, terminal)
