import { TransformationProvider } from '../../domain/value-objects/TransformationProvider';

/**
 * Provider cost comparison static fallback data.
 *
 * PRICING STRATEGY:
 *
 * 1. Primary source: token-costs npm package
 *    - Fetches pricing from https://mikkotikkanen.github.io/token-costs/
 *    - Daily updates at 00:01 UTC
 *    - Covers: OpenAI, Anthropic, Google, OpenRouter
 *    - 0 runtime dependencies, automatic caching in ProviderPricingService
 *
 * 2. Fallback: This static data
 *    - Used when token-costs fetch fails (no internet, timeout, service down)
 *    - Used for local/custom providers (Ollama, OpenCode, Azure, Cursor)
 *    - Manually updated when major pricing changes occur
 *
 * ARCHITECTURE:
 * - ProviderPricingService attempts token-costs fetch with 3s timeout
 * - On success: Uses calculated per-transform cost (~500 input + 200 output tokens)
 * - On failure: Falls back to these static values
 * - Cache TTL: 1 hour
 *
 * Last manual update: 2026-05-24
 * Sources: openai.com/api/pricing, anthropic.com/pricing, ai.google.dev/pricing
 */
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
  {
    provider: TransformationProvider.OpenCode,
    costPerTransform: 'Free (local compute)',
    speed: 'Medium',
    privacy: 'Local',
    quality: 'High',
    bestFor: 'Reuse OpenCode provider setup (Anthropic, OpenAI, Ollama, etc.)',
  },
  {
    provider: TransformationProvider.OpenRouter,
    costPerTransform: 'Varies by model',
    speed: 'Fast',
    privacy: 'Cloud',
    quality: 'High',
    bestFor: 'Access 200+ models with one API key',
    apiKeyUrl: 'https://openrouter.ai/settings/keys',
  },
  {
    provider: TransformationProvider.Cursor,
    costPerTransform: '~$0.01',
    speed: 'Fast',
    privacy: 'Cloud',
    quality: 'High',
    bestFor: 'Access Cursor Composer and frontier models with one API key',
    apiKeyUrl: 'https://cursor.com/dashboard/integrations',
  },
];

export function formatProviderComparisonSummary(): string {
  const header = `Whisper transcription: ${WHISPER_COST_NOTE}\n\nPrompt optimization providers:`;
  const rows = PROVIDER_COMPARISON.map(
    entry => `• ${entry.provider}: ${entry.costPerTransform}/transform — ${entry.bestFor}`
  );
  return `${header}\n${rows.join('\n')}`;
}
