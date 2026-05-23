import {
  validateConfigurationForRecording,
  validateConfigurationOnStartup,
} from '../../../application/services/ConfigurationValidationService';
import { IConfigRepository, Config } from '../../../application/ports/IConfigRepository';
import { ITransformationProviderValidator } from '../../../application/ports/ITransformationProviderValidator';
import { TransformationProvider } from '../../../domain/value-objects/TransformationProvider';

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

function createConfigRepo(
  overrides: Partial<Config> = {},
  providerKeys: Partial<Record<TransformationProvider, string | undefined>> = {}
): IConfigRepository {
  const config = { ...baseConfig, ...overrides };

  return {
    getConfig: jest.fn(async () => config),
    updateConfig: jest.fn(async () => undefined),
    getProviderApiKey: jest.fn(async provider => {
      if (provider in providerKeys) {
        return providerKeys[provider];
      }
      return provider === TransformationProvider.OpenAI ? 'openai-key' : 'provider-key';
    }),
    setProviderApiKey: jest.fn(async () => undefined),
    onConfigChange: jest.fn(),
  };
}

function createProviderValidator(
  validateProvider: ITransformationProviderValidator['validateProvider']
): ITransformationProviderValidator {
  return { validateProvider };
}

describe('ConfigurationValidationService', () => {
  describe('validateConfigurationForRecording', () => {
    it('requires OpenAI key for Whisper transcription', async () => {
      const configRepo = createConfigRepo({}, { [TransformationProvider.OpenAI]: undefined });
      const validateProvider = jest.fn(async (_provider: TransformationProvider) => undefined);
      const validator = createProviderValidator(validateProvider);

      const issue = await validateConfigurationForRecording(configRepo, validator);

      expect(issue).toEqual({
        message: 'OpenAI API Key is required for Whisper transcription.',
        configureCommand: 'cursor-whisper.configureApiKey',
      });
    });

    it('skips provider validation when prompt transformation is disabled', async () => {
      const configRepo = createConfigRepo({ enablePromptTransformation: false });
      const validateProvider = jest.fn(async (_provider: TransformationProvider) =>
        'Anthropic API key is not configured.'
      );
      const validator = createProviderValidator(validateProvider);

      const issue = await validateConfigurationForRecording(configRepo, validator);

      expect(issue).toBeUndefined();
      expect(validateProvider).not.toHaveBeenCalled();
    });

    it('validates active provider when prompt transformation is enabled', async () => {
      const configRepo = createConfigRepo();
      const validateProvider = jest.fn(async (_provider: TransformationProvider) =>
        'Anthropic API key is not configured.'
      );
      const validator = createProviderValidator(validateProvider);

      const issue = await validateConfigurationForRecording(configRepo, validator);

      expect(validateProvider).toHaveBeenCalledWith(TransformationProvider.Anthropic);
      expect(issue).toEqual({
        message: 'Anthropic API key is not configured.',
        configureCommand: 'cursor-whisper.configureTransformationProvider',
      });
    });
  });

  describe('validateConfigurationOnStartup', () => {
    it('warns about missing OpenAI key for transcription', async () => {
      const configRepo = createConfigRepo({}, { [TransformationProvider.OpenAI]: undefined });
      const validateProvider = jest.fn(async (_provider: TransformationProvider) => undefined);
      const validator = createProviderValidator(validateProvider);

      const issue = await validateConfigurationOnStartup(configRepo, validator);

      expect(issue?.message).toContain('OpenAI API Key is required for Whisper transcription');
      expect(issue?.configureCommand).toBe('cursor-whisper.configureApiKey');
    });

    it('does not warn about transformation provider keys when transformation is disabled', async () => {
      const configRepo = createConfigRepo({ enablePromptTransformation: false });
      const validateProvider = jest.fn(async (_provider: TransformationProvider) =>
        'Anthropic API key is not configured.'
      );
      const validator = createProviderValidator(validateProvider);

      const issue = await validateConfigurationOnStartup(configRepo, validator);

      expect(issue).toBeUndefined();
      expect(validateProvider).not.toHaveBeenCalled();
    });

    it('warns about missing key for the active transformation provider', async () => {
      const configRepo = createConfigRepo(
        { transformationProvider: TransformationProvider.Anthropic },
        {
          [TransformationProvider.OpenAI]: 'openai-key',
          [TransformationProvider.Anthropic]: undefined,
        }
      );
      const validateProvider = jest.fn(async (_provider: TransformationProvider) => undefined);
      const validator = createProviderValidator(validateProvider);

      const issue = await validateConfigurationOnStartup(configRepo, validator);

      expect(issue).toEqual({
        message:
          'Cursor Whisper: Anthropic API Key is not configured for prompt optimization.',
        configureCommand: 'cursor-whisper.configureTransformationProvider',
      });
    });

    it('validates Ollama reachability without requiring an API key', async () => {
      const configRepo = createConfigRepo(
        { transformationProvider: TransformationProvider.Ollama },
        { [TransformationProvider.OpenAI]: 'openai-key' }
      );
      const validateProvider = jest.fn(async (_provider: TransformationProvider) =>
        'Ollama server is not reachable. Ensure Ollama is running locally.'
      );
      const validator = createProviderValidator(validateProvider);

      const issue = await validateConfigurationOnStartup(configRepo, validator);

      expect(issue?.message).toContain('Ollama server is not reachable');
      expect(issue?.configureCommand).toBe('cursor-whisper.configureTransformationProvider');
    });
  });
});
