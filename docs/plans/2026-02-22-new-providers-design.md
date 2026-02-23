# New Providers Design: OpenRouter + DeepSeek

> Goal: Add OpenRouter and DeepSeek as selectable providers, giving access to a curated list of major models across multiple AI families.

---

## Architecture

Both providers are OpenAI-compatible APIs. They reuse the existing `openai` npm package with a custom `baseURL` — the same pattern as the existing Grok provider. No new dependencies are required.

| Provider   | Class               | File                          | Env var                | Base URL                          |
|------------|---------------------|-------------------------------|------------------------|-----------------------------------|
| OpenRouter | `OpenRouterProvider` | `src/providers/openrouter.ts` | `OPENROUTER_API_KEY`   | `https://openrouter.ai/api/v1`    |
| DeepSeek   | `DeepSeekProvider`   | `src/providers/deepseek.ts`   | `DEEPSEEK_API_KEY`     | `https://api.deepseek.com/v1`     |

---

## Model Lists

### DeepSeek

| Model ID              | Name               | Context |
|-----------------------|--------------------|---------|
| `deepseek-chat`       | DeepSeek V3        | 64K     |
| `deepseek-reasoner`   | DeepSeek R1        | 64K     |

### OpenRouter (curated list)

| Model ID                                | Name                   | Context |
|-----------------------------------------|------------------------|---------|
| `anthropic/claude-opus-4-5`             | Claude Opus 4.5        | 200K    |
| `anthropic/claude-sonnet-4-5`           | Claude Sonnet 4.5      | 200K    |
| `anthropic/claude-haiku-4-5`            | Claude Haiku 4.5       | 200K    |
| `meta-llama/llama-3.3-70b-instruct`     | Llama 3.3 70B          | 128K    |
| `meta-llama/llama-3.1-405b-instruct`    | Llama 3.1 405B         | 128K    |
| `google/gemini-2.0-flash-001`           | Gemini 2.0 Flash       | 1M      |
| `google/gemini-2.5-pro-preview`         | Gemini 2.5 Pro         | 1M      |
| `mistralai/mistral-large-2411`          | Mistral Large          | 128K    |
| `mistralai/codestral-2501`              | Codestral              | 256K    |
| `deepseek/deepseek-r1`                  | DeepSeek R1            | 64K     |
| `deepseek/deepseek-chat-v3-0324`        | DeepSeek V3            | 64K     |
| `x-ai/grok-3`                           | Grok 3                 | 131K    |
| `openai/gpt-4o`                         | GPT-4o                 | 128K    |
| `openai/o3-mini`                        | o3-mini                | 200K    |
| `qwen/qwen-2.5-72b-instruct`            | Qwen 2.5 72B           | 128K    |

---

## Implementation

### New files
- `src/providers/openrouter.ts` — `OpenRouterProvider` class
- `src/providers/deepseek.ts` — `DeepSeekProvider` class

### Modified files
- `src/providers/index.ts` — export and register both providers in `createProvider`
- `src/config/env.ts` — add `OPENROUTER_API_KEY` and `DEEPSEEK_API_KEY` to `ENV_VARS`

### OpenRouter-specific header
OpenRouter requires an `HTTP-Referer` header for attribution. Set it to `https://github.com/opencli` and pass `X-Title: opencli` in the OpenAI client `defaultHeaders`.

---

## Non-goals
- Dynamic model fetching from the OpenRouter API
- Free-text model ID entry
- Anthropic or Mistral native SDKs
