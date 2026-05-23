import {
  ConfigurablePromptTransformer,
  PromptTransformerFactory,
} from '../../infrastructure/transformation/PromptTransformerFactory';
import { OpenAIPromptTransformer } from '../../infrastructure/transformation/OpenAIPromptTransformer';
import { AnthropicPromptTransformer } from '../../infrastructure/transformation/AnthropicPromptTransformer';
import { OllamaPromptTransformer } from '../../infrastructure/transformation/OllamaPromptTransformer';
import { TransformationProvider } from '../../domain/value-objects/TransformationProvider';
import { IConfigRepository, Config } from '../../application/ports/IConfigRepository';
import { createMockLogger } from '../helpers/mockLogger';

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

function createSwitchableConfigRepo(): IConfigRepository & {
  setProvider: (provider: TransformationProvider) => void;
} {
  let activeProvider = TransformationProvider.OpenAI;
  const config = { ...baseConfig };

  return {
    setProvider(provider: TransformationProvider) {
      activeProvider = provider;
      config.transformationProvider = provider;
    },
    getConfig: jest.fn(async () => ({
      ...config,
      transformationProvider: activeProvider,
    })),
    updateConfig: jest.fn(async partial => {
      if (partial.transformationProvider) {
        activeProvider = partial.transformationProvider;
        config.transformationProvider = partial.transformationProvider;
      }
    }),
    getProviderApiKey: jest.fn(async provider => `${provider}-key`),
    setProviderApiKey: jest.fn(async () => undefined),
    onConfigChange: jest.fn(),
  };
}

describe('Provider switching workflow', () => {
  it('ConfigurablePromptTransformer resolves the active provider on each transform call', async () => {
    const configRepo = createSwitchableConfigRepo();
    const factory = new PromptTransformerFactory(configRepo, createMockLogger());
    const transformer = new ConfigurablePromptTransformer(factory);

    const openAiTransformer = factory.createForProvider(TransformationProvider.OpenAI);
    const anthropicTransformer = factory.createForProvider(TransformationProvider.Anthropic);
    const transformSpy = jest
      .spyOn(OpenAIPromptTransformer.prototype, 'transform')
      .mockResolvedValue({
        originalText: 'first prompt',
        transformedText: 'first prompt',
        improvements: [],
      });
    jest.spyOn(AnthropicPromptTransformer.prototype, 'transform').mockResolvedValue({
      originalText: 'second prompt',
      transformedText: 'second prompt',
      improvements: [],
    });

    configRepo.setProvider(TransformationProvider.OpenAI);
    await transformer.transform('first prompt');

    configRepo.setProvider(TransformationProvider.Anthropic);
    await transformer.transform('second prompt');

    expect(transformSpy).toHaveBeenCalledTimes(1);
    expect(AnthropicPromptTransformer.prototype.transform).toHaveBeenCalledTimes(1);
    expect(openAiTransformer).toBeInstanceOf(OpenAIPromptTransformer);
    expect(anthropicTransformer).toBeInstanceOf(AnthropicPromptTransformer);
  });

  it('factory validation reflects provider-specific requirements after switching', async () => {
    const configRepo = createSwitchableConfigRepo();
    const factory = new PromptTransformerFactory(configRepo, createMockLogger());

    configRepo.setProvider(TransformationProvider.Anthropic);
    (configRepo.getProviderApiKey as jest.Mock).mockImplementation(async provider =>
      provider === TransformationProvider.Anthropic ? undefined : `${provider}-key`
    );

    await expect(factory.validateProvider(TransformationProvider.Anthropic)).resolves.toContain(
      'Anthropic API key'
    );

    configRepo.setProvider(TransformationProvider.Ollama);
    jest.spyOn(OllamaPromptTransformer, 'isAvailable').mockResolvedValueOnce(false);

    await expect(factory.validateProvider(TransformationProvider.Ollama)).resolves.toContain(
      'Ollama server is not reachable'
    );
  });
});
