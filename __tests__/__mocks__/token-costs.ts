export class CostClient {
  calculateCost = jest.fn();
  getModelPricing = jest.fn();
  getModelPricingOrNull = jest.fn();
  getProviderModels = jest.fn();
  listModels = jest.fn();
  getRawProviderData = jest.fn();
  getCachedDate = jest.fn();
  clearCache = jest.fn();
}

export class ClockMismatchError extends Error {}
