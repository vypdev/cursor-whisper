import {
  TransformationProvider,
  parseTransformationProvider,
  isTransformationProvider,
  getProviderSecretKey,
  PROVIDER_METADATA,
} from '../../../domain/value-objects/TransformationProvider';

describe('TransformationProvider', () => {
  it('parses valid provider values', () => {
    expect(parseTransformationProvider('anthropic')).toBe(TransformationProvider.Anthropic);
    expect(parseTransformationProvider('ollama')).toBe(TransformationProvider.Ollama);
    expect(parseTransformationProvider('opencode')).toBe(TransformationProvider.OpenCode);
    expect(parseTransformationProvider('openrouter')).toBe(TransformationProvider.OpenRouter);
    expect(parseTransformationProvider('cursor')).toBe(TransformationProvider.Cursor);
  });

  it('falls back to OpenAI for invalid values', () => {
    expect(parseTransformationProvider('invalid')).toBe(TransformationProvider.OpenAI);
    expect(parseTransformationProvider(undefined)).toBe(TransformationProvider.OpenAI);
  });

  it('validates provider strings', () => {
    expect(isTransformationProvider('google')).toBe(true);
    expect(isTransformationProvider('unknown')).toBe(false);
  });

  it('generates provider-specific secret keys', () => {
    expect(getProviderSecretKey(TransformationProvider.Anthropic)).toBe(
      'promptimize.apiKey.anthropic'
    );
  });

  it('defines metadata for all providers', () => {
    for (const provider of Object.values(TransformationProvider)) {
      expect(PROVIDER_METADATA[provider].id).toBe(provider);
      expect(PROVIDER_METADATA[provider].displayName).toBeTruthy();
    }
  });
});
