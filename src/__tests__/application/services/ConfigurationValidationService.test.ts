import {
  validateConfigurationForRecording,
  validateConfigurationForTranscription,
  validateConfigurationForPromptimize,
  validateConfigurationOnStartup,
} from '../../../application/services/ConfigurationValidationService';
import { IConfigRepository, Config } from '../../../application/ports/IConfigRepository';
import { ITransformationProviderValidator } from '../../../application/ports/ITransformationProviderValidator';
import { TransformationProvider } from '../../../domain/value-objects/TransformationProvider';
import { OPENAI_API_KEY_REQUIRED_RECORDING } from '../../../shared/constants/uxMessages';
import { TRANSFORMATION_SYSTEM_PROMPT } from '../../../infrastructure/transformation/transformationUtils';

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
  openCodeBaseUrl: 'http://127.0.0.1:4010/v1',
  openCodeModel: 'anthropic/claude-sonnet-4-5',
  openRouterModel: 'openai/gpt-4o',
  cursorModel: 'composer-2.5',
  audioQuality: 'high',
  maxRecordingDuration: 120,
  showNotifications: true,
  transformationSystemPrompt: TRANSFORMATION_SYSTEM_PROMPT,
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
  describe('validateConfigurationForTranscription', () => {
    it('requires OpenAI key for Whisper transcription', async () => {
      const configRepo = createConfigRepo({}, { [TransformationProvider.OpenAI]: undefined });

      const issue = await validateConfigurationForTranscription(configRepo);

      expect(issue).toEqual({
        message: OPENAI_API_KEY_REQUIRED_RECORDING,
        configureCommand: 'promptimize.openConfigurationPanel',
      });
    });

    it('passes when OpenAI key is configured', async () => {
      const configRepo = createConfigRepo();

      const issue = await validateConfigurationForTranscription(configRepo);

      expect(issue).toBeUndefined();
    });
  });

  describe('validateConfigurationForPromptimize', () => {
    it('opens configuration when prompt optimization is disabled', async () => {
      const configRepo = createConfigRepo({ enablePromptTransformation: false });
      const validator = createProviderValidator(jest.fn(async () => undefined));

      const issue = await validateConfigurationForPromptimize(configRepo, validator);

      expect(issue).toEqual({
        message: 'Prompt optimization is disabled. Enable it in configuration to use Promptimize.',
        configureCommand: 'promptimize.openConfigurationPanel',
      });
    });

    it('requires OpenAI key and provider configuration when optimization is enabled', async () => {
      const configRepo = createConfigRepo({}, { [TransformationProvider.OpenAI]: undefined });
      const validator = createProviderValidator(jest.fn(async () => undefined));

      const issue = await validateConfigurationForPromptimize(configRepo, validator);

      expect(issue?.configureCommand).toBe('promptimize.configureApiKey');
    });
  });

  describe('validateConfigurationForRecording', () => {
    it('requires OpenAI key for Whisper transcription', async () => {
      const configRepo = createConfigRepo({}, { [TransformationProvider.OpenAI]: undefined });
      const validateProvider = jest.fn(async (_provider: TransformationProvider) => undefined);
      const validator = createProviderValidator(validateProvider);

      const issue = await validateConfigurationForRecording(configRepo, validator);

      expect(issue).toEqual({
        message:
          'OpenAI API key is required for voice-to-text transcription (Whisper). Prompt optimization uses a separate provider you can configure later.',
        configureCommand: 'promptimize.configureApiKey',
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
        configureCommand: 'promptimize.openConfigurationPanel',
      });
    });
  });

  describe('validateConfigurationOnStartup', () => {
    it('warns about missing OpenAI key for transcription', async () => {
      const configRepo = createConfigRepo({}, { [TransformationProvider.OpenAI]: undefined });
      const validateProvider = jest.fn(async (_provider: TransformationProvider) => undefined);
      const validator = createProviderValidator(validateProvider);

      const issue = await validateConfigurationOnStartup(configRepo, validator);

      expect(issue?.message).toContain('OpenAI API key is required for voice-to-text transcription');
      expect(issue?.configureCommand).toBe('promptimize.openConfigurationPanel');
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
        message: 'Promptimize: Anthropic credentials are not configured for prompt optimization.',
        configureCommand: 'promptimize.openConfigurationPanel',
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
      expect(issue?.configureCommand).toBe('promptimize.openConfigurationPanel');
    });

    it('warns about missing key for Cursor transformation provider', async () => {
      const configRepo = createConfigRepo(
        { transformationProvider: TransformationProvider.Cursor },
        {
          [TransformationProvider.OpenAI]: 'openai-key',
          [TransformationProvider.Cursor]: undefined,
        }
      );
      const validateProvider = jest.fn(async (_provider: TransformationProvider) => undefined);
      const validator = createProviderValidator(validateProvider);

      const issue = await validateConfigurationOnStartup(configRepo, validator);

      expect(issue).toEqual({
        message: 'Promptimize: Cursor credentials are not configured for prompt optimization.',
        configureCommand: 'promptimize.openConfigurationPanel',
      });
    });
  });
});
