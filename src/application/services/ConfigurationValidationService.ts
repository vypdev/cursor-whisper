import { IConfigRepository } from '../ports/IConfigRepository';
import { ITransformationProviderValidator } from '../ports/ITransformationProviderValidator';
import {
  PROVIDER_METADATA,
  TransformationProvider,
} from '../../domain/value-objects/TransformationProvider';

export interface ConfigurationValidationIssue {
  message: string;
  configureCommand: 'cursor-whisper.configureApiKey' | 'cursor-whisper.configureTransformationProvider';
}

/**
 * Validates configuration required before recording starts.
 * Whisper transcription always requires an OpenAI API key.
 * When prompt transformation is enabled, the active provider must also be configured.
 */
export async function validateConfigurationForRecording(
  configRepo: IConfigRepository,
  providerValidator: ITransformationProviderValidator
): Promise<ConfigurationValidationIssue | undefined> {
  const config = await configRepo.getConfig();
  const openAiKey = await configRepo.getProviderApiKey(TransformationProvider.OpenAI);

  if (!openAiKey) {
    return {
      message: 'OpenAI API Key is required for Whisper transcription.',
      configureCommand: 'cursor-whisper.configureApiKey',
    };
  }

  if (!config.enablePromptTransformation) {
    return undefined;
  }

  const providerError = await providerValidator.validateProvider(config.transformationProvider);
  if (providerError) {
    return {
      message: providerError,
      configureCommand: 'cursor-whisper.configureTransformationProvider',
    };
  }

  return undefined;
}

/**
 * Validates configuration on extension startup.
 * Warns only about missing keys relevant to the current configuration.
 */
export async function validateConfigurationOnStartup(
  configRepo: IConfigRepository,
  providerValidator: ITransformationProviderValidator
): Promise<ConfigurationValidationIssue | undefined> {
  const config = await configRepo.getConfig();
  const openAiKey = await configRepo.getProviderApiKey(TransformationProvider.OpenAI);

  if (!openAiKey) {
    return {
      message: 'Cursor Whisper: OpenAI API Key is required for Whisper transcription.',
      configureCommand: 'cursor-whisper.configureApiKey',
    };
  }

  if (!config.enablePromptTransformation) {
    return undefined;
  }

  const provider = config.transformationProvider;
  const metadata = PROVIDER_METADATA[provider];

  if (!metadata.requiresApiKey) {
    const providerError = await providerValidator.validateProvider(provider);
    if (providerError) {
      return {
        message: `Cursor Whisper: ${providerError}`,
        configureCommand: 'cursor-whisper.configureTransformationProvider',
      };
    }
    return undefined;
  }

  const providerApiKey = await configRepo.getProviderApiKey(provider);
  if (!providerApiKey) {
    return {
      message: `Cursor Whisper: ${metadata.displayName} API Key is not configured for prompt optimization.`,
      configureCommand: 'cursor-whisper.configureTransformationProvider',
    };
  }

  const providerError = await providerValidator.validateProvider(provider);
  if (providerError) {
    return {
      message: `Cursor Whisper: ${providerError}`,
      configureCommand: 'cursor-whisper.configureTransformationProvider',
    };
  }

  return undefined;
}
