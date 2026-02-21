# Headless Mode

Headless mode allows you to use Open-CLI in non-interactive environments like CI/CD pipelines, scripts, and automation.

## Basic Usage

### Single Prompt

Run a single prompt and exit automatically:

```bash
open-cli -p "Explain what this codebase does"
```

The command runs the prompt, outputs the response, and exits.

### Output Formats

#### Text (Default)

Plain text output:

```bash
open-cli -p "Hello" --output-format text
```

Output:

```
Hello! How can I help you today?
```

#### JSON

Structured JSON output for parsing:

```bash
open-cli -p "List the files in src/" --output-format json
```

Output:

```json
{
  "content": "Here are the files in the src/ directory:\n\n- cli/\n- providers/\n- tools/\n- config/\n- ...",
  "toolCalls": null
}
```

#### Stream-JSON

Newline-delimited JSON stream for real-time processing:

```bash
open-cli -p "Write a hello world program" --output-format stream-json
```

Output:

```
{"type":"content","content":"Here"}
{"type":"content","content":" is"}
{"type":"content","content":" a"}
{"type":"content","content":" simple"}
...
{"type":"done"}
```

## Command Line Options

| Option            | Alias | Description                                   |
| ----------------- | ----- | --------------------------------------------- |
| `--prompt`        | `-p`  | The prompt to run                             |
| `--provider`      |       | Provider name (openai, gemini, grok, minimax) |
| `--model`         | `-m`  | Model ID                                      |
| `--output-format` | `-o`  | Output format: text, json, stream-json        |
| `--verbose`       |       | Enable info-level logging                     |
| `--debug`         |       | Enable debug-level logging                    |

## Use Cases

### CI/CD Integration

#### Code Review in Pull Requests

```bash
# In your CI script
open-cli -p "Review this PR for bugs: $(git diff)" --output-format json | jq -r '.content'
```

#### Automated Testing

```bash
# Generate test cases
open-cli -p "Generate unit tests for src/calculator.ts" -o json > tests/generated.test.ts
```

#### Documentation Generation

```bash
# Generate README from code
open-cli -p "Generate a README for this project based on the files" -o text > README.md
```

### Scripting

#### Batch Processing

```bash
for file in src/*.ts; do
  open-cli -p "Summarize $file" --output-format text
done
```

#### File Transformation

```bash
# Convert file formats
open-cli -p "Convert this JSON to YAML: $(cat config.json)" -o text > config.yaml
```

### Development Workflows

#### Quick Queries

```bash
# Quick answer without opening interactive mode
open-cli -p "What does async/await do in JavaScript?"
```

#### Code Generation

```bash
# Generate boilerplate
open-cli -p "Create a React component for a button with props" -o text
```

## Examples

### Example 1: List All TODOs

```bash
open-cli -p "Find all TODO comments in this codebase" -o text
```

### Example 2: Extract Function Names

```bash
open-cli -p "List all exported functions from src/index.ts" -o json | jq -r '.content'
```

### Example 3: Explain Error

```bash
open-cli -p "Explain this error: $(cat error.log)" -o text
```

### Example 4: Pipe to File

```bash
open-cli -p "Write a Python script to parse CSV files" -o text > parse_csv.py
```

### Example 5: Use Specific Model

```bash
open-cli -p "Summarize this article" -m gpt-4o-mini
```

### Example 6: Chain with Other Tools

```bash
# Get answer and copy to clipboard
open-cli -p "What is the capital of France?" -o text | pbcopy
```

## Error Handling

Exit codes indicate success/failure:

| Exit Code | Meaning                                |
| --------- | -------------------------------------- |
| 0         | Success                                |
| 1         | Error (API error, network issue, etc.) |

### Check for Errors

```bash
open-cli -p "Your prompt" -o text
if [ $? -eq 0 ]; then
  echo "Success"
else
  echo "Failed"
fi
```

## Combining with Session Management

### Resume a Session

```bash
# Continue a saved session in headless mode
open-cli --provider openai -m gpt-4o -p "Continue where we left off"
```

### Save Session After

```bash
# Run prompt and save the session
open-cli -p "Help me with this bug" && open-cli --chat save bugfix
```

## Performance Tips

1. **Use smaller models** for simple tasks:

   ```bash
   open-cli -p "Quick question" -m gpt-4o-mini
   ```

2. **Use JSON output** when parsing programmatically

3. **Disable logging** for cleaner output:
   ```bash
   open-cli -p "Prompt" 2>/dev/null
   ```

## Debugging

Use `--verbose` or `--debug` to troubleshoot:

```bash
# See what's happening
open-cli -p "Prompt" --verbose

# Full debug output
open-cli -p "Prompt" --debug
```
