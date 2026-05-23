import { PromptTransformerFactory } from '../../../infrastructure/transformation/PromptTransformerFactory';
import { OpenAIPromptTransformer } from '../../../infrastructure/transformation/OpenAIPromptTransformer';
import { AnthropicPromptTransformer } from '../../../infrastructure/transformation/AnthropicPromptTransformer';
import { GooglePromptTransformer } from '../../../infrastructure/transformation/GooglePromptTransformer';
import { AzureOpenAIPromptTransformer } from '../../../infrastructure/transformation/AzureOpenAIPromptTransformer';
import { OllamaPromptTransformer } from '../../../infrastructure/transformation/OllamaPromptTransformer';
import { TransformationProvider } from '../../../domain/value-objects/TransformationProvider';
import { IConfigRepository, Config } from '../../../application/ports/IConfigRepository';
import { createMockLogger } from '../../helpers/mockLogger';

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
  audioQuality: 'high',
  maxRecordingDuration: 120,
  showNotifications: true,
};

function createConfigRepo(overrides: Partial<Config> = {}): IConfigRepository {
  const config = { ...baseConfig, ...overrides };

  return {
    getConfig: jest.fn(async () => config),
    updateConfig: jest.fn(async () => undefined),
    getProviderApiKey: jest.fn(async provider => {
      if (provider === TransformationProvider.Ollama) {
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
});
