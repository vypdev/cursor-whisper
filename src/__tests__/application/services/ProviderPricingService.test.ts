import { CostClient } from 'token-costs';
import { TransformationProvider } from '../../../domain/value-objects/TransformationProvider';
import { ProviderPricingService } from '../../../application/services/ProviderPricingService';

jest.mock('token-costs', () => ({
  CostClient: jest.fn(),
}));

const MockCostClient = CostClient as jest.MockedClass<typeof CostClient>;

describe('ProviderPricingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns real-time pricing for supported cloud providers', async () => {
    MockCostClient.mockImplementation(
      () =>
        ({
          calculateCost: jest.fn().mockResolvedValue({
            inputCost: 0.001,
            outputCost: 0.003,
            totalCost: 0.004,
            usedCachedPricing: false,
            date: '2026-05-24',
            stale: false,
          }),
        }) as unknown as CostClient
    );

    const service = new ProviderPricingService();
    const comparison = await service.getProviderComparison();

    expect(comparison).toHaveLength(8);

    const openAi = comparison.find(entry => entry.provider === TransformationProvider.OpenAI);
    expect(openAi).toMatchObject({
      costPerTransform: '~$0.004/transform',
      isRealTime: true,
      lastUpdated: '2026-05-24',
    });

    const ollama = comparison.find(entry => entry.provider === TransformationProvider.Ollama);
    expect(ollama).toMatchObject({
      costPerTransform: 'Free (local compute)',
      isRealTime: false,
    });
  });

  it('falls back to static pricing when token-costs fetch fails', async () => {
    MockCostClient.mockImplementation(
      () =>
        ({
          calculateCost: jest.fn().mockRejectedValue(new Error('network error')),
        }) as unknown as CostClient
    );

    const service = new ProviderPricingService();
    const comparison = await service.getProviderComparison();

    expect(comparison.every(entry => !entry.isRealTime)).toBe(true);
    expect(comparison.find(entry => entry.provider === TransformationProvider.OpenAI)?.costPerTransform).toBe(
      '~$0.01'
    );
  });

  it('reuses cached pricing within the cache window', async () => {
    const calculateCost = jest.fn().mockResolvedValue({
      inputCost: 0.001,
      outputCost: 0.003,
      totalCost: 0.004,
      usedCachedPricing: false,
      date: '2026-05-24',
      stale: false,
    });

    MockCostClient.mockImplementation(
      () =>
        ({
          calculateCost,
        }) as unknown as CostClient
    );

    const service = new ProviderPricingService();
    await service.getProviderComparison();
    await service.getProviderComparison();

    expect(calculateCost).toHaveBeenCalledTimes(4);
  });
});
