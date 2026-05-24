import { CostClient, type Provider } from 'token-costs';
import { TransformationProvider } from '../../domain/value-objects/TransformationProvider';
import { PROVIDER_COMPARISON as STATIC_FALLBACK } from '../../shared/constants/providerComparison';

/** Typical prompt optimization workload: system prompt + transcription in, structured prompt out. */
const ESTIMATED_INPUT_TOKENS = 500;
const ESTIMATED_OUTPUT_TOKENS = 200;

const CACHE_TTL_MS = 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 3000;

interface TokenCostsMapping {
  tokenCostsProvider: Provider;
  modelId: string;
}

const TOKEN_COSTS_MAPPINGS: Partial<Record<TransformationProvider, TokenCostsMapping>> = {
  [TransformationProvider.OpenAI]: {
    tokenCostsProvider: 'openai',
    modelId: 'gpt-4o',
  },
  [TransformationProvider.Anthropic]: {
    tokenCostsProvider: 'anthropic',
    modelId: 'claude-3-5-sonnet-20241022',
  },
  [TransformationProvider.Google]: {
    tokenCostsProvider: 'google',
    modelId: 'gemini-1.5-pro',
  },
  [TransformationProvider.OpenRouter]: {
    tokenCostsProvider: 'openrouter',
    modelId: 'openai/gpt-4o',
  },
};

export interface ProviderPricingData {
  provider: TransformationProvider;
  costPerTransform: string;
  speed: string;
  privacy: string;
  bestFor: string;
  isRealTime: boolean;
  lastUpdated?: string;
}

export class ProviderPricingService {
  private costClient: CostClient | null = null;
  private cache: ProviderPricingData[] | null = null;
  private cacheTimestamp = 0;

  async getProviderComparison(): Promise<ProviderPricingData[]> {
    if (this.isCacheValid() && this.cache) {
      return this.cache;
    }

    if (!this.costClient) {
      this.costClient = new CostClient();
    }

    const fetchTargets = STATIC_FALLBACK.filter(entry => TOKEN_COSTS_MAPPINGS[entry.provider]);
    const realTimeResults = await Promise.all(
      fetchTargets.map(entry => this.fetchProviderPricing(entry.provider))
    );

    const realTimeMap = new Map(
      realTimeResults
        .filter((result): result is ProviderPricingData => result !== null)
        .map(result => [result.provider, result])
    );

    const comparison = STATIC_FALLBACK.map(entry => {
      const realTime = realTimeMap.get(entry.provider);
      if (realTime) {
        return realTime;
      }

      return {
        provider: entry.provider,
        costPerTransform: entry.costPerTransform,
        speed: entry.speed,
        privacy: entry.privacy,
        bestFor: entry.bestFor,
        isRealTime: false,
      };
    });

    this.cache = comparison;
    this.cacheTimestamp = Date.now();
    return comparison;
  }

  private async fetchProviderPricing(
    provider: TransformationProvider
  ): Promise<ProviderPricingData | null> {
    const mapping = TOKEN_COSTS_MAPPINGS[provider];
    if (!mapping || !this.costClient) {
      return null;
    }

    const staticEntry = STATIC_FALLBACK.find(entry => entry.provider === provider);
    if (!staticEntry) {
      return null;
    }

    try {
      const costResult = await Promise.race([
        this.costClient.calculateCost(mapping.tokenCostsProvider, mapping.modelId, {
          inputTokens: ESTIMATED_INPUT_TOKENS,
          outputTokens: ESTIMATED_OUTPUT_TOKENS,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), FETCH_TIMEOUT_MS)
        ),
      ]);

      return {
        provider,
        costPerTransform: formatTransformCost(costResult.totalCost),
        speed: staticEntry.speed,
        privacy: staticEntry.privacy,
        bestFor: staticEntry.bestFor,
        isRealTime: true,
        lastUpdated: costResult.date,
      };
    } catch {
      return null;
    }
  }

  private isCacheValid(): boolean {
    if (!this.cache || this.cache.length === 0) {
      return false;
    }

    return Date.now() - this.cacheTimestamp < CACHE_TTL_MS;
  }
}

function formatTransformCost(totalCostUsd: number): string {
  if (totalCostUsd >= 0.01) {
    return `~$${totalCostUsd.toFixed(2)}/transform`;
  }

  return `~$${totalCostUsd.toFixed(3)}/transform`;
}
