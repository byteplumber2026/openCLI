# Custom Commands

Custom commands let you define your own slash commands with predefined prompts. This is useful for repetitive tasks or specialized workflows.

## Overview

Custom commands are defined as TOML files in `~/.open-cli/commands/`. Each file defines:

- `name`: The command name (without `/`)
- `description`: Shown in `/help` and `/commands list`
- `prompt`: The prompt sent to the AI when the command is executed

## Creating a Custom Command

### Step 1: Create the Commands Directory

```bash
mkdir -p ~/.open-cli/commands
```

### Step 2: Create a TOML File

Create `~/.open-cli/commands/review.toml`:

```toml
name = "review"
description = "Review code for bugs and issues"
prompt = """
Review this code for bugs, security issues, and improvements:

{{args}}

Focus on:
- Logic errors
- Security vulnerabilities
- Performance issues
- Code smells
"""
```

### Step 3: Use the Command

```
> /review src/index.ts
```

The AI will review the specified file(s).

## Command Structure

### TOML Format

| Field         | Required | Description                                 |
| ------------- | -------- | ------------------------------------------- |
| `name`        | Yes      | Command name (alphanumeric and underscores) |
| `description` | Yes      | Brief description shown in help             |
| `prompt`      | Yes      | The prompt template                         |

### Prompt Templates

The `prompt` field supports `{{args}}` placeholder:

```toml
prompt = """
Analyze this code:

{{args}}

Provide a detailed report.
"""
```

When you run `/review src/main.ts`, `{{args}}` is replaced with `src/main.ts`.

## Examples

### Code Review

`~/.open-cli/commands/review.toml`:

```toml
name = "review"
description = "Review code for issues"
prompt = """
Review the following code for bugs, security issues, and improvements:

{{args}}

Provide specific suggestions with code examples if possible.
"""
```

Usage:

```
> /review src/auth/login.ts
```

### Generate Tests

`~/.open-cli/commands/test.toml`:

```toml
name = "test"
description = "Generate unit tests"
prompt = """
Generate comprehensive unit tests for the following code:

{{args}}

Use Jest describe/it syntax. Include edge cases.
"""
```

Usage:

```
> /test src/utils/format.ts
```

### Explain Error

`~/.open-cli/commands/debug.toml`:

```toml
name = "debug"
description = "Debug error messages"
prompt = """
Debug this error. Explain what's wrong and how to fix it:

{{args}}
"""
```

Usage:

```
> /debug TypeError: Cannot read property 'map' of undefined
```

### Documentation

`~/.open-cli/commands/docs.toml`:

```toml
name = "docs"
description = "Generate documentation"
prompt = """
Generate documentation for this code:

{{args}}

Include:
- Overview
- API reference
- Usage examples
"""
```

Usage:

```
> /docs src/api/client.ts
```

### Refactor

`~/.open-cli/commands/refactor.toml`:

```toml
name = "refactor"
description = "Refactor code for readability"
prompt = """
Refactor this code to improve readability and maintainability:

{{args}}

Explain the changes made.
"""
```

Usage:

```
> /refactor src/legacy/handler.ts
```

### Commit Message

`~/.open-cli/commands/commit.toml`:

```toml
name = "commit"
description = "Generate commit message"
prompt = """
Analyze these changes and suggest a commit message following conventional commits:

{{args}}

Provide:
- Type (feat, fix, docs, etc.)
- Short description
- Longer description if needed
"""
```

Usage:

```
> /commit
# Then paste git diff output
```

## Managing Commands

### List Commands

```
> /commands list
```

Output:

```
Custom Commands:
  review     - Review code for issues
  test      - Generate unit tests
  debug     - Debug error messages
  docs      - Generate documentation
```

### Reload Commands

If you add or modify commands while Open-CLI is running:

```
> /commands reload
```

### Command Priority

Built-in commands take priority over custom commands. If you create a custom command with the same name as a built-in, the built-in will be used.

## Advanced Usage

### Multi-line Arguments

For complex prompts, use triple quotes:

```toml
prompt = """
{{args}}

Consider:
- Performance implications
- Error handling
- Edge cases
"""
```

### Conditional Prompts

You can create different commands for different scenarios:

`~/.open-cli/commands/explain-ts.toml`:

```toml
name = "explain-ts"
description = "Explain TypeScript concepts"
prompt = """
Explain this TypeScript code in detail:

{{args}}

Include type explanations.
"""
```

### Chain Commands

After one command completes, you can run another:

```
> /review src/app.ts
# After review completes...
> /test src/app.ts
```

## Best Practices

1. **Use descriptive names**: `code-review` not `cr`

2. **Write clear descriptions**: Help others understand when to use the command

3. **Keep prompts focused**: One specific task per command

4. **Include `{{args}}`**: Allow users to specify what to operate on

5. **Test your commands**: Run them to ensure they work as expected

## Troubleshooting

### Command Not Found

1. Check the file is in `~/.open-cli/commands/`

2. Ensure the file has `.toml` extension

3. Verify the TOML syntax is valid

4. Reload commands:
   ```
   > /commands reload
   ```

### Invalid TOML

Common issues:

- Missing quotes around strings
- Incorrect indentation
- Unclosed triple quotes

### Args Not Replaced

Make sure to use `{{args}}` (double braces) in your prompt template.
