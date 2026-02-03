// src/tools/web.ts

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
    throw new Error('BRAVE_API_KEY not set. Get a free key at https://brave.com/search/api/');
  }

  const params = new URLSearchParams({
    q: args.query,
    count: String(Math.min(args.count || 5, 10)),
  });

  const response = await fetch(
    `https://api.search.brave.com/res/v1/web/search?${params}`,
    {
      headers: {
        'X-Subscription-Token': apiKey,
        'Accept': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Search failed: ${response.statusText}`);
  }

  const data = await response.json();
  const results: BraveResult[] = data.web?.results || [];

  if (results.length === 0) {
    return 'No results found';
  }

  return results
    .map((r, i) =>
      `${i + 1}. ${r.title}\n   ${r.url}\n   ${r.description}`)
    .join('\n\n');
}
