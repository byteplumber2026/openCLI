// src/cli/prompt.ts
import { select, confirm } from '@inquirer/prompts';
import chalk from 'chalk';
import { getAvailableProviders, getApiKey, getEnvVar, SUPPORTED_PROVIDERS } from '../config/env.js';
import { getDefaultProvider, setDefaultProvider, getDefaultModel, setDefaultModel } from '../config/settings.js';
import { createProvider, type Provider } from '../providers/index.js';

interface ProviderChoice {
  name: string;
  value: string;
  disabled?: string;
}

export function getProviderChoices(): ProviderChoice[] {
  const available = getAvailableProviders();

  return SUPPORTED_PROVIDERS.map(provider => {
    const hasKey = available.includes(provider);
    const envVar = getEnvVar(provider);

    return {
      name: hasKey
        ? `${provider.charAt(0).toUpperCase() + provider.slice(1)}`
        : `${provider} ${chalk.dim(`(set ${envVar})`)}`,
      value: provider,
      disabled: hasKey ? undefined : `No API key`,
    };
  });
}

export async function selectProvider(): Promise<Provider> {
  const defaultProvider = getDefaultProvider();
  const available = getAvailableProviders();

  // If default is set and available, use it
  if (defaultProvider && available.includes(defaultProvider)) {
    const apiKey = getApiKey(defaultProvider)!;
    return createProvider(defaultProvider, apiKey);
  }

  // If only one provider available, use it
  if (available.length === 1) {
    const apiKey = getApiKey(available[0])!;
    const provider = createProvider(available[0], apiKey);
    console.log(chalk.dim(`Using ${provider.name} (only available provider)`));
    return provider;
  }

  // If no providers available, error
  if (available.length === 0) {
    console.log(chalk.red('No API keys found. Please set one of:'));
    SUPPORTED_PROVIDERS.forEach(p => {
      console.log(chalk.yellow(`  ${getEnvVar(p)}`));
    });
    process.exit(1);
  }

  // Interactive selection
  console.log(chalk.bold('\nWelcome to open-cli!\n'));

  const choices = getProviderChoices();
  const providerName = await select({
    message: 'Select a provider:',
    choices,
  });

  const apiKey = getApiKey(providerName)!;
  const provider = createProvider(providerName, apiKey);

  // Ask to save as default
  const saveDefault = await confirm({
    message: 'Save as default provider?',
    default: true,
  });

  if (saveDefault) {
    setDefaultProvider(providerName);
  }

  return provider;
}

export async function selectModel(provider: Provider): Promise<string> {
  const defaultModel = getDefaultModel();
  const models = provider.listModels();

  // If default model exists for this provider, use it
  if (defaultModel && models.find(m => m.id === defaultModel)) {
    return defaultModel;
  }

  // If only one model, use it
  if (models.length === 1) {
    return models[0].id;
  }

  const modelId = await select({
    message: 'Select a model:',
    choices: models.map(m => ({
      name: `${m.name} (${m.contextWindow.toLocaleString()} tokens)`,
      value: m.id,
    })),
  });

  const saveDefault = await confirm({
    message: 'Save as default model?',
    default: true,
  });

  if (saveDefault) {
    setDefaultModel(modelId);
  }

  return modelId;
}
