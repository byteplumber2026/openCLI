import { ProviderError } from "./errors.js";

export interface RetryOptions {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

const DEFAULT_OPTIONS: RetryOptions = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
};

export function isRetryable(error: unknown): boolean {
  if (error instanceof ProviderError) {
    return error.retryable;
  }
  return true;
}

export function getRetryDelay(
  attempt: number,
  baseDelay: number,
  retryAfter?: number,
  maxDelay?: number,
): number {
  const exponential = baseDelay * Math.pow(2, attempt);
  const delay = retryAfter ? Math.max(exponential, retryAfter) : exponential;
  return maxDelay ? Math.min(delay, maxDelay) : delay;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function* withRetry<T>(
  fn: () => AsyncIterable<T>,
  options?: Partial<RetryOptions>,
  onRetry?: (attempt: number, delayMs: number, error: Error) => void,
): AsyncIterable<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      for await (const value of fn()) {
        yield value;
      }
      return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (!isRetryable(error) || attempt >= opts.maxRetries) {
        throw lastError;
      }

      const retryAfter =
        error instanceof ProviderError && "retryAfterMs" in error
          ? (error as any).retryAfterMs
          : undefined;

      const delay = getRetryDelay(
        attempt,
        opts.baseDelayMs,
        retryAfter,
        opts.maxDelayMs,
      );
      onRetry?.(attempt + 1, delay, lastError);
      await sleep(delay);
    }
  }

  throw lastError;
}
