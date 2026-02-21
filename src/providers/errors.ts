export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly retryable: boolean = false,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

export class RateLimitError extends ProviderError {
  public readonly retryAfterMs?: number;

  constructor(message: string, retryAfterMs?: number) {
    super(message, 429, true);
    this.name = "RateLimitError";
    this.retryAfterMs = retryAfterMs;
  }
}

export class NetworkError extends ProviderError {
  constructor(message: string) {
    super(message, undefined, true);
    this.name = "NetworkError";
  }
}

export class AuthError extends ProviderError {
  constructor(message: string) {
    super(message, 401, false);
    this.name = "AuthError";
  }
}

const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503]);
const NETWORK_ERROR_CODES = new Set([
  "ECONNRESET",
  "ETIMEDOUT",
  "ECONNREFUSED",
  "EPIPE",
  "UND_ERR_CONNECT_TIMEOUT",
]);

export function classifyError(raw: any): ProviderError {
  const status = raw?.status ?? raw?.statusCode;
  const message = raw?.message ?? String(raw);
  const code = raw?.code;

  if (code && NETWORK_ERROR_CODES.has(code)) {
    return new NetworkError(message);
  }
  if (message?.includes("fetch failed") || message?.includes("ECONNRESET")) {
    return new NetworkError(message);
  }

  if (status === 429) {
    const retryAfter = raw?.headers?.get?.("retry-after");
    const retryMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : undefined;
    return new RateLimitError(message, retryMs);
  }

  if (status === 401 || status === 403) {
    return new AuthError(message);
  }

  if (RETRYABLE_STATUS_CODES.has(status)) {
    return new ProviderError(message, status, true);
  }

  return new ProviderError(message, status, false);
}
