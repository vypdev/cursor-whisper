export enum TransformationProvider {
  OpenAI = 'openai',
  Anthropic = 'anthropic',
  Google = 'google',
  Azure = 'azure',
  Ollama = 'ollama',
}

export interface ProviderMetadata {
  id: TransformationProvider;
  displayName: string;
  description: string;
  requiresApiKey: boolean;
  defaultModel: string;
}

export const PROVIDER_METADATA: Record<TransformationProvider, ProviderMetadata> = {
  [TransformationProvider.OpenAI]: {
    id: TransformationProvider.OpenAI,
    displayName: 'OpenAI',
    description: 'GPT-4o and other OpenAI chat models',
    requiresApiKey: true,
    defaultModel: 'gpt-4o',
  },
  [TransformationProvider.Anthropic]: {
    id: TransformationProvider.Anthropic,
    displayName: 'Anthropic',
    description: 'Claude 3.5 Sonnet and other Claude models',
    requiresApiKey: true,
    defaultModel: 'claude-3-5-sonnet-20241022',
  },
  [TransformationProvider.Google]: {
    id: TransformationProvider.Google,
    displayName: 'Google Gemini',
    description: 'Gemini 1.5 Pro and Flash models',
    requiresApiKey: true,
    defaultModel: 'gemini-1.5-pro',
  },
  [TransformationProvider.Azure]: {
    id: TransformationProvider.Azure,
    displayName: 'Azure OpenAI',
    description: 'GPT models deployed on Azure OpenAI Service',
    requiresApiKey: true,
    defaultModel: 'gpt-4o',
  },
  [TransformationProvider.Ollama]: {
    id: TransformationProvider.Ollama,
    displayName: 'Ollama (Local)',
    description: 'Local LLMs via Ollama (Llama, Mistral, etc.)',
    requiresApiKey: false,
    defaultModel: 'llama3.1:8b',
  },
};

export function isTransformationProvider(value: string): value is TransformationProvider {
  return Object.values(TransformationProvider).includes(value as TransformationProvider);
}

export function parseTransformationProvider(
  value: string | undefined,
  fallback: TransformationProvider = TransformationProvider.OpenAI
): TransformationProvider {
  if (value && isTransformationProvider(value)) {
    return value;
  }
  return fallback;
}

export function getProviderSecretKey(provider: TransformationProvider): string {
  return `cursor-whisper.apiKey.${provider}`;
}
