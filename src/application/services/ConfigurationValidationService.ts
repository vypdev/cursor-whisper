import { IConfigRepository } from '../ports/IConfigRepository';
import { ITransformationProviderValidator } from '../ports/ITransformationProviderValidator';
import {
  PROVIDER_METADATA,
  TransformationProvider,
} from '../../domain/value-objects/TransformationProvider';
import {
  OPENAI_API_KEY_REQUIRED_RECORDING,
  OPENAI_API_KEY_REQUIRED_STARTUP,
  OPTIMIZATION_PROVIDER_MISSING_KEY,
} from '../../shared/constants/uxMessages';

export interface ConfigurationValidationIssue {
  message: string;
  configureCommand:
    | 'promptimize.configureApiKey'
    | 'promptimize.configureTransformationProvider'
    | 'promptimize.openConfigurationPanel'
    | 'promptimize.firstTimeSetup';
}

/**
 * Validates configuration required before transcription-only recording.
 */
export async function validateConfigurationForTranscription(
  configRepo: IConfigRepository
): Promise<ConfigurationValidationIssue | undefined> {
  const openAiKey = await configRepo.getProviderApiKey(TransformationProvider.OpenAI);

  if (!openAiKey) {
    return {
      message: OPENAI_API_KEY_REQUIRED_RECORDING,
      configureCommand: 'promptimize.openConfigurationPanel',
    };
  }

  return undefined;
}

/**
 * Validates configuration required before promptimize recording (transcribe + optimize).
 */
export async function validateConfigurationForPromptimize(
  configRepo: IConfigRepository,
  providerValidator: ITransformationProviderValidator
): Promise<ConfigurationValidationIssue | undefined> {
  const config = await configRepo.getConfig();

  if (!config.enablePromptTransformation) {
    return {
      message: 'Prompt optimization is disabled. Enable it in configuration to use Promptimize.',
      configureCommand: 'promptimize.openConfigurationPanel',
    };
  }

  return validateConfigurationForRecording(configRepo, providerValidator);
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
      message: OPENAI_API_KEY_REQUIRED_RECORDING,
      configureCommand: 'promptimize.configureApiKey',
    };
  }

  if (!config.enablePromptTransformation) {
    return undefined;
  }

  const providerError = await providerValidator.validateProvider(config.transformationProvider);
  if (providerError) {
    return {
      message: providerError,
      configureCommand: 'promptimize.openConfigurationPanel',
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
      message: OPENAI_API_KEY_REQUIRED_STARTUP,
      configureCommand: 'promptimize.openConfigurationPanel',
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
        message: `Promptimize: ${providerError}`,
        configureCommand: 'promptimize.openConfigurationPanel',
      };
    }
    return undefined;
  }

  const providerApiKey = await configRepo.getProviderApiKey(provider);
  if (!providerApiKey) {
    return {
      message: OPTIMIZATION_PROVIDER_MISSING_KEY(metadata.displayName),
      configureCommand: 'promptimize.openConfigurationPanel',
    };
  }

  const providerError = await providerValidator.validateProvider(provider);
  if (providerError) {
    return {
      message: `Promptimize: ${providerError}`,
      configureCommand: 'promptimize.openConfigurationPanel',
    };
  }

  return undefined;
}
