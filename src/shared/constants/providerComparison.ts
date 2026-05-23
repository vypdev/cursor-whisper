import { TransformationProvider } from '../../domain/value-objects/TransformationProvider';

export interface ProviderComparisonEntry {
  provider: TransformationProvider;
  costPerTransform: string;
  speed: string;
  privacy: string;
  quality: string;
  bestFor: string;
  apiKeyUrl?: string;
}

export const WHISPER_COST_NOTE = '~$0.006/min (always OpenAI Whisper)';

export const PROVIDER_COMPARISON: ProviderComparisonEntry[] = [
  {
    provider: TransformationProvider.OpenAI,
    costPerTransform: '~$0.01',
    speed: 'Fast',
    privacy: 'Cloud',
    quality: 'High',
    bestFor: 'General use; reuse the same OpenAI key as Whisper',
    apiKeyUrl: 'https://platform.openai.com/api-keys',
  },
  {
    provider: TransformationProvider.Anthropic,
    costPerTransform: '~$0.01–0.02',
    speed: 'Fast',
    privacy: 'Cloud',
    quality: 'Very High',
    bestFor: 'Complex reasoning and instruction following',
    apiKeyUrl: 'https://console.anthropic.com/',
  },
  {
    provider: TransformationProvider.Google,
    costPerTransform: '~$0.001',
    speed: 'Very Fast',
    privacy: 'Cloud',
    quality: 'Good',
    bestFor: 'Cost-sensitive or high-volume usage',
    apiKeyUrl: 'https://aistudio.google.com/app/apikey',
  },
  {
    provider: TransformationProvider.Azure,
    costPerTransform: 'Varies',
    speed: 'Fast',
    privacy: 'Private Cloud',
    quality: 'High',
    bestFor: 'Enterprise Azure OpenAI deployments',
    apiKeyUrl: 'https://portal.azure.com/',
  },
  {
    provider: TransformationProvider.Ollama,
    costPerTransform: 'Free (local compute)',
    speed: 'Medium',
    privacy: 'Local',
    quality: 'Good',
    bestFor: 'Privacy-first or offline use (no API key)',
  },
];

export function formatProviderComparisonSummary(): string {
  const header = `Whisper transcription: ${WHISPER_COST_NOTE}\n\nPrompt optimization providers:`;
  const rows = PROVIDER_COMPARISON.map(
    entry => `• ${entry.provider}: ${entry.costPerTransform}/transform — ${entry.bestFor}`
  );
  return `${header}\n${rows.join('\n')}`;
}
