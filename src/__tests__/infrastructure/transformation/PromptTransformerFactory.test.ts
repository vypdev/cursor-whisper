import { PromptTransformerFactory } from '../../../infrastructure/transformation/PromptTransformerFactory';
import { OpenAIPromptTransformer } from '../../../infrastructure/transformation/OpenAIPromptTransformer';
import { AnthropicPromptTransformer } from '../../../infrastructure/transformation/AnthropicPromptTransformer';
import { GooglePromptTransformer } from '../../../infrastructure/transformation/GooglePromptTransformer';
import { AzureOpenAIPromptTransformer } from '../../../infrastructure/transformation/AzureOpenAIPromptTransformer';
import { OllamaPromptTransformer } from '../../../infrastructure/transformation/OllamaPromptTransformer';
import { OpenCodePromptTransformer } from '../../../infrastructure/transformation/OpenCodePromptTransformer';
import { OpenRouterPromptTransformer } from '../../../infrastructure/transformation/OpenRouterPromptTransformer';
import { CursorPromptTransformer } from '../../../infrastructure/transformation/CursorPromptTransformer';
import { TransformationProvider } from '../../../domain/value-objects/TransformationProvider';
import { IConfigRepository, Config } from '../../../application/ports/IConfigRepository';
import { createMockLogger } from '../../helpers/mockLogger';
import { TRANSFORMATION_SYSTEM_PROMPT } from '../../../infrastructure/transformation/transformationUtils';

const baseConfig: Config = {
  transformationProvider: TransformationProvider.OpenAI,
  transcriptionLanguage: 'auto',
  enablePromptTransformation: true,
  transformationModel: 'gpt-4o',
  anthropicModel: 'claude-3-5-sonnet-20241022',
  googleModel: 'gemini-1.5-pro',
  azureEndpoint: 'https://example.openai.azure.com',
  azureDeployment: 'gpt-4o',
  ollamaBaseUrl: 'http://localhost:11434',
  ollamaModel: 'llama3.1:8b',
  openCodeBaseUrl: 'http://127.0.0.1:4010/v1',
  openCodeModel: 'anthropic/claude-sonnet-4-5',
  openRouterModel: 'openai/gpt-4o',
  cursorModel: 'composer-2.5',
  audioQuality: 'high',
  maxRecordingDuration: 120,
  showNotifications: true,
  transformationSystemPrompt: TRANSFORMATION_SYSTEM_PROMPT,
};

function createConfigRepo(overrides: Partial<Config> = {}): IConfigRepository {
  const config = { ...baseConfig, ...overrides };

  return {
    getConfig: jest.fn(async () => config),
    updateConfig: jest.fn(async () => undefined),
    getProviderApiKey: jest.fn(async provider => {
      if (
        provider === TransformationProvider.Ollama ||
        provider === TransformationProvider.OpenCode
      ) {
        return undefined;
      }
      return 'test-api-key';
    }),
    setProviderApiKey: jest.fn(async () => undefined),
    onConfigChange: jest.fn(),
  };
}

const logger = createMockLogger();

describe('PromptTransformerFactory', () => {
  it('creates OpenAI transformer by default', async () => {
    const factory = new PromptTransformerFactory(createConfigRepo(), logger);
    const transformer = await factory.createForProvider(TransformationProvider.OpenAI);
    expect(transformer).toBeInstanceOf(OpenAIPromptTransformer);
  });

  it('creates provider-specific transformers', async () => {
    const factory = new PromptTransformerFactory(createConfigRepo(), logger);

    expect(await factory.createForProvider(TransformationProvider.Anthropic)).toBeInstanceOf(
      AnthropicPromptTransformer
    );
    expect(await factory.createForProvider(TransformationProvider.Google)).toBeInstanceOf(
      GooglePromptTransformer
    );
    expect(await factory.createForProvider(TransformationProvider.Azure)).toBeInstanceOf(
      AzureOpenAIPromptTransformer
    );
    expect(await factory.createForProvider(TransformationProvider.Ollama)).toBeInstanceOf(
      OllamaPromptTransformer
    );
    expect(await factory.createForProvider(TransformationProvider.OpenCode)).toBeInstanceOf(
      OpenCodePromptTransformer
    );
    expect(await factory.createForProvider(TransformationProvider.OpenRouter)).toBeInstanceOf(
      OpenRouterPromptTransformer
    );
    expect(await factory.createForProvider(TransformationProvider.Cursor)).toBeInstanceOf(
      CursorPromptTransformer
    );
  });

  it('validates missing API keys', async () => {
    const configRepo = createConfigRepo();
    (configRepo.getProviderApiKey as jest.Mock).mockResolvedValue(undefined);

    const factory = new PromptTransformerFactory(configRepo, logger);
    const error = await factory.validateProvider(TransformationProvider.Anthropic);

    expect(error).toContain('Anthropic API key');
  });

  it('validates Azure configuration', async () => {
    const factory = new PromptTransformerFactory(
      createConfigRepo({ azureEndpoint: '', azureDeployment: '' }),
      logger
    );

    const error = await factory.validateProvider(TransformationProvider.Azure);
    expect(error).toContain('endpoint');
  });

  it('validates OpenCode configuration', async () => {
    jest.spyOn(OpenCodePromptTransformer, 'isAvailable').mockResolvedValueOnce(false);

    const factory = new PromptTransformerFactory(createConfigRepo(), logger);
    const error = await factory.validateProvider(TransformationProvider.OpenCode);

    expect(error).toContain('OpenCode proxy is not reachable');
  });

  it('validates missing OpenCode model', async () => {
    const factory = new PromptTransformerFactory(
      createConfigRepo({ openCodeModel: '' }),
      logger
    );
    const error = await factory.validateProvider(TransformationProvider.OpenCode);

    expect(error).toContain('OpenCode model is not configured');
  });
});
