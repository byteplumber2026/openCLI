import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { webSearch } from '../../src/tools/web.js';

describe('webSearch', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('throws error when BRAVE_API_KEY not set', async () => {
    delete process.env.BRAVE_API_KEY;
    await expect(webSearch({ query: 'test' })).rejects.toThrow('BRAVE_API_KEY not set');
  });

  it('returns formatted results on success', async () => {
    process.env.BRAVE_API_KEY = 'test-key';

    const mockResults = {
      web: {
        results: [
          { title: 'Result 1', url: 'https://example.com/1', description: 'Description 1' },
          { title: 'Result 2', url: 'https://example.com/2', description: 'Description 2' },
        ],
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResults),
    });

    const result = await webSearch({ query: 'test query' });

    expect(result).toContain('1. Result 1');
    expect(result).toContain('https://example.com/1');
    expect(result).toContain('Description 1');
    expect(result).toContain('2. Result 2');
  });

  it('returns "No results found" when empty', async () => {
    process.env.BRAVE_API_KEY = 'test-key';

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ web: { results: [] } }),
    });

    const result = await webSearch({ query: 'obscure query' });
    expect(result).toBe('No results found');
  });

  it('throws error on API failure', async () => {
    process.env.BRAVE_API_KEY = 'test-key';

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      statusText: 'Unauthorized',
    });

    await expect(webSearch({ query: 'test' })).rejects.toThrow('Search failed: Unauthorized');
  });

  it('limits count to 10 max', async () => {
    process.env.BRAVE_API_KEY = 'test-key';

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ web: { results: [] } }),
    });

    await webSearch({ query: 'test', count: 20 });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('count=10'),
      expect.any(Object)
    );
  });
});
