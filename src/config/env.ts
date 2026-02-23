const ENV_VARS: Record<string, string> = {
  openai: 'OPENAI_API_KEY',
  grok: 'XAI_API_KEY',
  minimax: 'MINIMAX_API_KEY',
  gemini: 'GOOGLE_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY',
  openrouter: 'OPENROUTER_API_KEY',
};

export function getApiKey(provider: string): string | undefined {
  const envVar = ENV_VARS[provider];
  return envVar ? process.env[envVar] : undefined;
}

export function getAvailableProviders(): string[] {
  return Object.entries(ENV_VARS)
    .filter(([_, envVar]) => process.env[envVar])
    .map(([provider]) => provider);
}

export function getEnvVar(provider: string): string | undefined {
  return ENV_VARS[provider];
}

export const SUPPORTED_PROVIDERS = Object.keys(ENV_VARS);
