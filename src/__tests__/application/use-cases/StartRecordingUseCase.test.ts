import { StartRecordingUseCase } from '../../../application/use-cases/StartRecordingUseCase';
import { IAudioRecorder } from '../../../application/ports/IAudioRecorder';
import { IConfigRepository, Config } from '../../../application/ports/IConfigRepository';
import { ITransformationProviderValidator } from '../../../application/ports/ITransformationProviderValidator';
import { TransformationProvider } from '../../../domain/value-objects/TransformationProvider';
import { MissingApiKeyError, InvalidConfigError } from '../../../domain/errors/ConfigError';
import { RecordingError } from '../../../domain/errors/RecordingError';
import { createMockLogger } from '../../helpers/mockLogger';

const baseConfig: Config = {
  transformationProvider: TransformationProvider.Anthropic,
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

function createMocks(options?: {
  openAiKey?: string;
  enablePromptTransformation?: boolean;
  providerValidationError?: string;
  isRecording?: boolean;
}) {
  const configRepo: IConfigRepository = {
    getConfig: jest.fn(async () => ({
      ...baseConfig,
      enablePromptTransformation: options?.enablePromptTransformation ?? true,
    })),
    updateConfig: jest.fn(async () => undefined),
    getProviderApiKey: jest.fn(async provider => {
      if (provider === TransformationProvider.OpenAI) {
        return options && 'openAiKey' in options ? options.openAiKey : 'openai-key';
      }
      return 'provider-key';
    }),
    setProviderApiKey: jest.fn(async () => undefined),
    onConfigChange: jest.fn(),
  };

  const providerValidator: ITransformationProviderValidator = {
    validateProvider: jest.fn(async () => options?.providerValidationError),
  };

  const audioRecorder: IAudioRecorder = {
    startRecording: jest.fn(async () => undefined),
    stopRecording: jest.fn(),
    cancelRecording: jest.fn(),
    isRecording: jest.fn(() => options?.isRecording ?? false),
    getState: jest.fn(),
    onStateChange: jest.fn(),
  };

  return { configRepo, providerValidator, audioRecorder };
}

describe('StartRecordingUseCase', () => {
  it('throws MissingApiKeyError when OpenAI key is missing', async () => {
    const { configRepo, providerValidator, audioRecorder } = createMocks({ openAiKey: undefined });
    const useCase = new StartRecordingUseCase(
      audioRecorder,
      configRepo,
      providerValidator,
      createMockLogger()
    );

    await expect(useCase.execute()).rejects.toThrow(MissingApiKeyError);
    expect(audioRecorder.startRecording).not.toHaveBeenCalled();
  });

  it('throws InvalidConfigError when active provider is misconfigured', async () => {
    const { configRepo, providerValidator, audioRecorder } = createMocks({
      providerValidationError: 'Anthropic API key is not configured.',
    });
    const useCase = new StartRecordingUseCase(
      audioRecorder,
      configRepo,
      providerValidator,
      createMockLogger()
    );

    await expect(useCase.execute()).rejects.toThrow(InvalidConfigError);
    expect(providerValidator.validateProvider).toHaveBeenCalledWith(
      TransformationProvider.Anthropic
    );
  });

  it('starts recording when OpenAI and active provider are configured', async () => {
    const { configRepo, providerValidator, audioRecorder } = createMocks();
    const useCase = new StartRecordingUseCase(
      audioRecorder,
      configRepo,
      providerValidator,
      createMockLogger()
    );

    await useCase.execute();

    expect(audioRecorder.startRecording).toHaveBeenCalled();
  });

  it('does not validate provider when prompt transformation is disabled', async () => {
    const { configRepo, providerValidator, audioRecorder } = createMocks({
      enablePromptTransformation: false,
      providerValidationError: 'Anthropic API key is not configured.',
    });
    const useCase = new StartRecordingUseCase(
      audioRecorder,
      configRepo,
      providerValidator,
      createMockLogger()
    );

    await useCase.execute();

    expect(providerValidator.validateProvider).not.toHaveBeenCalled();
    expect(audioRecorder.startRecording).toHaveBeenCalled();
  });

  it('throws RecordingError when already recording', async () => {
    const { configRepo, providerValidator, audioRecorder } = createMocks({ isRecording: true });
    const useCase = new StartRecordingUseCase(
      audioRecorder,
      configRepo,
      providerValidator,
      createMockLogger()
    );

    await expect(useCase.execute()).rejects.toThrow(RecordingError);
  });
});
