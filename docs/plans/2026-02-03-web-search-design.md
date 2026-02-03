# Web Search Tool Design

Add web search capability to open_cli, allowing the LLM to fetch live information from the web.

## Overview

**Goal:** Enable the LLM to search the web when it needs current information (news, facts, etc.)

**Approach:** Add `web_search` as a new tool using Brave Search API. The LLM decides when to call it, same as other tools.

**Provider:** Brave Search API
- Free tier: 2,000 queries/month
- Requires `BRAVE_API_KEY` environment variable
- Endpoint: `https://api.search.brave.com/res/v1/web/search`

## Tool Definition

```typescript
{
  name: 'web_search',
  description: 'Search the web for current information',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search query' },
      count: { type: 'number', description: 'Number of results (1-10, default 5)' }
    },
    required: ['query']
  }
}
```

## Implementation

### New File: `src/tools/web.ts`

```typescript
export interface WebSearchArgs {
  query: string;
  count?: number;
}

interface BraveResult {
  title: string;
  url: string;
  description: string;
}

export async function webSearch(args: WebSearchArgs): Promise<string> {
  const apiKey = process.env.BRAVE_API_KEY;
  if (!apiKey) {
    throw new Error('BRAVE_API_KEY not set');
  }

  const params = new URLSearchParams({
    q: args.query,
    count: String(args.count || 5),
  });

  const response = await fetch(
    `https://api.search.brave.com/res/v1/web/search?${params}`,
    { headers: { 'X-Subscription-Token': apiKey } }
  );

  if (!response.ok) {
    throw new Error(`Search failed: ${response.statusText}`);
  }

  const data = await response.json();
  const results = data.web?.results || [];

  return results
    .map((r: BraveResult, i: number) =>
      `${i + 1}. ${r.title}\n   ${r.url}\n   ${r.description}`)
    .join('\n\n') || 'No results found';
}
```

## Integration

### Files to Modify

1. **`src/tools/definitions.ts`** - Add web_search to TOOL_DEFINITIONS
2. **`src/tools/executor.ts`** - Add case for web_search in runTool(), add to SAFE_TOOLS
3. **`src/tools/index.ts`** - Export webSearch function
4. **`src/tools/systemPrompt.ts`** - Add web_search to tool list

### Confirmation Logic

`web_search` is a **safe operation** (read-only) - no confirmation needed.

## Testing

### Unit Tests: `tests/tools/web.test.ts`

- Test webSearch returns formatted results (mock fetch)
- Test error when BRAVE_API_KEY missing
- Test handles empty results gracefully

### Manual Test

```
npm run dev
> What are the top 3 news stories today?
# LLM should call web_search, then summarize results
```

## Environment

- `BRAVE_API_KEY` - Required for web search to work
- Get free API key at: https://brave.com/search/api/
