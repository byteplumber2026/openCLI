# Session Management

Open-CLI allows you to save, resume, and export conversation sessions. This is useful for continuing conversations later or sharing them with others.

## How Sessions Work

Sessions are automatically associated with your current project (determined by the working directory). Sessions from different projects are stored separately.

### Storage Location

Sessions are stored in:

```
~/.open-cli/sessions/<project-hash>/
```

Each session is saved as a JSON file named `<tag>.json`.

## Commands

### /chat save

Save the current conversation with a tag:

```
> /chat save my-feature
```

Tags must be alphanumeric with hyphens or underscores only (e.g., `bug-fix`, `session_1`).

**Example:**

```
> Let's work on the login feature
> ... (multiple messages) ...
> /chat save login-feature
Session saved as "login-feature"
```

### /chat list

List all saved sessions for the current project:

```
> /chat list
```

Output:

```
Saved Sessions:
  login-feature   openai/gpt-4o    15 messages   Updated: 2026-02-20 10:30
  bug-fix        openai/gpt-4o    8 messages    Updated: 2026-02-19 15:45
```

### /chat resume

Resume a saved session:

```
> /chat resume login-feature
```

This loads all messages from the session and continues the conversation.

**Example:**

```
> /chat resume login-feature
Loaded session "login-feature" (15 messages)
> Continue implementing the login
```

### /chat delete

Delete a saved session:

```
> /chat delete old-session
```

**Example:**

```
> /chat delete test-session
Session "test-session" deleted
```

## Exporting Sessions

### /export

Export the current conversation to a file or clipboard.

#### Export as Markdown

```
> /export md
> /export md conversation.md
```

If no filename is provided, copies to clipboard.

#### Export as JSON

```
> /export json
> /export json conversation.json
```

### Export Format Examples

#### Markdown Export

```markdown
# Session: login-feature

- Provider: openai
- Model: gpt-4o
- Created: 2026-02-20 10:30:00

---

## User

I need to implement user login

## Assistant

I'll help you implement user login. What authentication method would you prefer?

## User

JWT-based authentication

## Assistant

I'll create a JWT authentication system...
```

#### JSON Export

```json
{
  "tag": "login-feature",
  "provider": "openai",
  "model": "gpt-4o",
  "createdAt": "2026-02-20T10:30:00.000Z",
  "messages": [
    {
      "role": "user",
      "content": "I need to implement user login"
    },
    {
      "role": "assistant",
      "content": "I'll help you implement user login..."
    }
  ]
}
```

## Use Cases

### Resume Long Conversations

Save a long conversation before exiting, resume it next time:

```
> /chat save current-work
> /exit

# Later...
> open-cli
> /chat resume current-work
```

### Share with Team Members

Export a session and share the file:

```
> /export md login-design.md
# Copies to clipboard, paste in Slack/email
```

Or export to file:

```
> /export md login-design.md
# Creates login-design.md
```

### Project-Specific Sessions

Sessions are automatically organized by project. You can have different sessions for different projects:

```
# Project A
/chat save feature-1
/chat save feature-2

# Project B (different directory)
/chat save experiment
```

### Backup Important Work

Regularly save important conversations:

```
# After significant progress
> /chat save backup-$(date +%Y%m%d)
```

## Session Metadata

Each session stores:

- **tag**: Your chosen identifier
- **provider**: AI provider used (e.g., openai)
- **model**: Model ID (e.g., gpt-4o)
- **messages**: All conversation messages
- **createdAt**: When the session was first created
- **updatedAt**: Last modification time
- **projectHash**: Hash of the working directory

## Best Practices

1. **Use descriptive tags**: `login-implementation` not `session1`

2. **Export important sessions**: Backup to files for long-term storage

3. **Clean up old sessions**: Use `/chat delete` to remove unused sessions

4. **Check session list**: Use `/chat list` to see what you have saved

5. **Resume before continuing**: Always resume a session before adding more messages

## Troubleshooting

### Session not found

If `/chat resume` fails:

```
Session "my-session" not found
```

Possible causes:

- You're in a different project directory
- The tag is misspelled
- The session was deleted

Solution: Check available sessions with `/chat list`

### Can't save session

If `/chat save` fails:

```
Invalid tag: must be alphanumeric with hyphens/underscores only
```

Solution: Use only letters, numbers, hyphens, and underscores in tags
