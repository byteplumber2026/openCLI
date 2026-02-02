import Conf from 'conf';

interface OpenCliConfig {
  defaultProvider?: string;
  defaultModel?: string;
  preferences: {
    temperature: number;
  };
  styles: {
    promptColor: string;
    codeTheme: string;
  };
}

const defaults: OpenCliConfig = {
  preferences: {
    temperature: 0.7,
  },
  styles: {
    promptColor: 'cyan',
    codeTheme: 'monokai',
  },
};

export const config = new Conf<OpenCliConfig>({
  projectName: 'open-cli',
  defaults,
});

export function getDefaultProvider(): string | undefined {
  return config.get('defaultProvider');
}

export function setDefaultProvider(provider: string): void {
  config.set('defaultProvider', provider);
}

export function getDefaultModel(): string | undefined {
  return config.get('defaultModel');
}

export function setDefaultModel(model: string): void {
  config.set('defaultModel', model);
}

export function getStyles() {
  return config.get('styles');
}

export function setStyles(styles: Partial<OpenCliConfig['styles']>): void {
  const current = config.get('styles');
  config.set('styles', { ...current, ...styles });
}
