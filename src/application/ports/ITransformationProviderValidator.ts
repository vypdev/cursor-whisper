import { TransformationProvider } from '../../domain/value-objects/TransformationProvider';

/**
 * Validates that a transformation provider is configured and reachable.
 */
export interface ITransformationProviderValidator {
  /**
   * Returns an error message when the provider is not ready, otherwise undefined.
   */
  validateProvider(provider: TransformationProvider): Promise<string | undefined>;
}
