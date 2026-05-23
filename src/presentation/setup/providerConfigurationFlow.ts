import * as vscode from 'vscode';
import { IConfigRepository } from '../../application/ports/IConfigRepository';
import { ILogger } from '../../application/ports/ILogger';
import { PromptTransformerFactory } from '../../infrastructure/transformation/PromptTransformerFactory';
import {
  OpenAIModelService,
  OpenAIModelServiceError,
} from '../../infrastructure/openai/OpenAIModelService';
import { OllamaPromptTransformer } from '../../infrastructure/transformation/OllamaPromptTransformer';
import {
  TransformationProvider,
  PROVIDER_METADATA,
} from '../../domain/value-objects/TransformationProvider';
import { ApiKey } from '../../domain/value-objects/ApiKey';
import { PROVIDER_COMPARISON, WHISPER_COST_NOTE } from '../../shared/constants/providerComparison';
import {
  OPENAI_API_KEY_DETAIL,
  OPENAI_API_KEY_PROMPT,
  OPTIMIZATION_PROVIDER_INTRO,
  OPTIMIZATION_PROVIDER_INTRO_DETAIL,
} from '../../shared/constants/uxMessages';

const ANTHROPIC_MODELS = [
  'claude-3-5-sonnet-20241022',
  'claude-3-5-haiku-20241022',
  'claude-3-opus-20240229',
  'claude-3-sonnet-20240229',
  'claude-3-haiku-20240307',
];

const GOOGLE_MODELS = ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.0-flash'];

export async function promptForOpenAiApiKey(): Promise<string | undefined> {
  return vscode.window.showInputBox({
    title: 'Configure OpenAI API Key (Required for Whisper)',
    prompt: OPENAI_API_KEY_PROMPT,
    password: true,
    placeHolder: 'sk-...',
    validateInput: value => {
      try {
        new ApiKey(value);
        return null;
      } catch (error) {
        return error instanceof Error ? error.message : 'Invalid API key';
      }
    },
  });
}

export async function testOpenAiApiKey(
  modelService: OpenAIModelService
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const models = await modelService.listGptModels();
    if (models.length === 0) {
      return { ok: false, message: 'API key is valid but no GPT models were returned.' };
    }
    return { ok: true };
  } catch (error) {
    const message =
      error instanceof OpenAIModelServiceError
        ? error.message
        : error instanceof Error
          ? error.message
          : 'Unknown error';
    return { ok: false, message };
  }
}

export async function promptForProviderApiKey(
  provider: TransformationProvider
): Promise<string | undefined> {
  const metadata = PROVIDER_METADATA[provider];
  const comparison = PROVIDER_COMPARISON.find(entry => entry.provider === provider);
  const keyHint = comparison?.apiKeyUrl ? ` Get a key at ${comparison.apiKeyUrl}` : '';

  return vscode.window.showInputBox({
    title: `Configure ${metadata.displayName} for Prompt Optimization`,
    prompt: `Enter your ${metadata.displayName} API key or credentials.${keyHint}`,
    password: true,
    placeHolder: provider === TransformationProvider.OpenAI ? 'sk-...' : 'API key',
    validateInput: value => {
      if (!value.trim()) {
        return 'API key or credentials are required';
      }

      if (provider === TransformationProvider.OpenAI) {
        try {
          new ApiKey(value);
          return null;
        } catch (error) {
          return error instanceof Error ? error.message : 'Invalid API key';
        }
      }

      return null;
    },
  });
}

export async function selectModelForProvider(
  provider: TransformationProvider,
  configRepo: IConfigRepository,
  modelService: OpenAIModelService,
  logger: ILogger
): Promise<string | undefined> {
  const config = await configRepo.getConfig();

  switch (provider) {
    case TransformationProvider.OpenAI: {
      const models = await modelService.listGptModels();
      if (models.length === 0) {
        await vscode.window.showWarningMessage('No GPT models were returned for your API key.');
        return config.transformationModel;
      }

      const selection = await vscode.window.showQuickPick(
        models.map(modelId => ({
          label: modelId,
          picked: modelId === config.transformationModel,
        })),
        { placeHolder: 'Select an OpenAI model for prompt optimization' }
      );
      return selection?.label;
    }

    case TransformationProvider.Anthropic: {
      const selection = await vscode.window.showQuickPick(
        ANTHROPIC_MODELS.map(modelId => ({
          label: modelId,
          picked: modelId === config.anthropicModel,
        })),
        { placeHolder: 'Select an Anthropic model for prompt optimization' }
      );
      return selection?.label;
    }

    case TransformationProvider.Google: {
      const selection = await vscode.window.showQuickPick(
        GOOGLE_MODELS.map(modelId => ({
          label: modelId,
          picked: modelId === config.googleModel,
        })),
        { placeHolder: 'Select a Google Gemini model for prompt optimization' }
      );
      return selection?.label;
    }

    case TransformationProvider.Azure: {
      const deployment = await vscode.window.showInputBox({
        prompt: 'Enter your Azure OpenAI deployment name',
        value: config.azureDeployment,
        placeHolder: 'gpt-4o-deployment',
        validateInput: value => (value.trim() ? null : 'Deployment name is required'),
      });
      return deployment?.trim();
    }

    case TransformationProvider.Ollama: {
      const baseUrl = config.ollamaBaseUrl || OllamaPromptTransformer.DEFAULT_BASE_URL;
      const available = await OllamaPromptTransformer.isAvailable(baseUrl);

      if (available) {
        try {
          const models = await OllamaPromptTransformer.listModels(baseUrl);
          if (models.length > 0) {
            const selection = await vscode.window.showQuickPick(
              models.map(modelId => ({
                label: modelId,
                picked: modelId === config.ollamaModel,
              })),
              { placeHolder: 'Select an Ollama model for prompt optimization' }
            );
            if (selection) {
              return selection.label;
            }
          }
        } catch (error) {
          logger.warn('Failed to list Ollama models', {
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      return vscode.window.showInputBox({
        prompt: 'Enter the Ollama model name/tag',
        value: config.ollamaModel,
        placeHolder: OllamaPromptTransformer.DEFAULT_MODEL,
        validateInput: value => (value.trim() ? null : 'Model name is required'),
      });
    }

    default:
      return undefined;
  }
}

export async function configureProviderSpecificSettings(
  provider: TransformationProvider,
  configRepo: IConfigRepository
): Promise<void> {
  if (provider === TransformationProvider.Azure) {
    const config = await configRepo.getConfig();
    const endpoint = await vscode.window.showInputBox({
      prompt: 'Enter your Azure OpenAI endpoint',
      value: config.azureEndpoint,
      placeHolder: 'https://my-resource.openai.azure.com',
      validateInput: value => (value.trim() ? null : 'Endpoint is required'),
    });

    if (endpoint) {
      await configRepo.updateConfig({ azureEndpoint: endpoint.trim() });
    }
  }

  if (provider === TransformationProvider.Ollama) {
    const config = await configRepo.getConfig();
    const baseUrl = await vscode.window.showInputBox({
      prompt: 'Enter your Ollama base URL',
      value: config.ollamaBaseUrl,
      placeHolder: OllamaPromptTransformer.DEFAULT_BASE_URL,
      validateInput: value => (value.trim() ? null : 'Base URL is required'),
    });

    if (baseUrl) {
      await configRepo.updateConfig({ ollamaBaseUrl: baseUrl.trim() });
    }
  }
}

export function buildProviderQuickPickItems(currentProvider: TransformationProvider): Array<{
  label: string;
  description: string;
  detail: string;
  provider: TransformationProvider;
}> {
  return PROVIDER_COMPARISON.map(entry => {
    const metadata = PROVIDER_METADATA[entry.provider];
    return {
      label: metadata.displayName,
      description: `${entry.costPerTransform}/transform · ${entry.speed} · ${entry.quality}`,
      detail: `${entry.bestFor}${metadata.id === currentProvider ? ' (current provider)' : ''}`,
      provider: entry.provider,
    };
  });
}

export async function confirmOptimizationIntro(): Promise<boolean> {
  const proceed = await vscode.window.showInformationMessage(
    OPTIMIZATION_PROVIDER_INTRO,
    { modal: true, detail: OPTIMIZATION_PROVIDER_INTRO_DETAIL },
    'Continue',
    'Cancel'
  );
  return proceed === 'Continue';
}

export async function selectTransformationProvider(
  currentProvider: TransformationProvider
): Promise<TransformationProvider | undefined> {
  const selection = await vscode.window.showQuickPick(
    buildProviderQuickPickItems(currentProvider),
    {
      placeHolder: 'Select a provider for prompt optimization',
      title: 'Cursor Whisper: Prompt Optimization Provider',
    }
  );

  return selection?.provider;
}

export async function applyProviderConfiguration(
  provider: TransformationProvider,
  selectedModel: string | undefined,
  configRepo: IConfigRepository,
  transformerFactory: PromptTransformerFactory
): Promise<{ success: boolean; message?: string }> {
  const updates: Parameters<typeof configRepo.updateConfig>[0] = {
    transformationProvider: provider,
  };

  if (selectedModel) {
    switch (provider) {
      case TransformationProvider.OpenAI:
        updates.transformationModel = selectedModel;
        break;
      case TransformationProvider.Anthropic:
        updates.anthropicModel = selectedModel;
        break;
      case TransformationProvider.Google:
        updates.googleModel = selectedModel;
        break;
      case TransformationProvider.Azure:
        updates.azureDeployment = selectedModel;
        break;
      case TransformationProvider.Ollama:
        updates.ollamaModel = selectedModel;
        break;
    }
  }

  await configRepo.updateConfig(updates);

  const validationError = await transformerFactory.validateProvider(provider);
  if (validationError) {
    return { success: false, message: validationError };
  }

  return { success: true };
}

export function formatProviderComparisonForWizard(): string {
  const rows = PROVIDER_COMPARISON.map(entry => {
    const metadata = PROVIDER_METADATA[entry.provider];
    const keyNote = metadata.requiresApiKey ? 'API key required' : 'No API key';
    return `${metadata.displayName}: ${entry.costPerTransform}, ${entry.bestFor} (${keyNote})`;
  });
  return `Whisper transcription cost: ${WHISPER_COST_NOTE}\n\n${rows.join('\n')}`;
}

export async function configureProviderCredentials(
  provider: TransformationProvider,
  configRepo: IConfigRepository
): Promise<boolean> {
  const metadata = PROVIDER_METADATA[provider];

  await configureProviderSpecificSettings(provider, configRepo);

  if (!metadata.requiresApiKey) {
    return true;
  }

  const existingKey = await configRepo.getProviderApiKey(provider);
  if (existingKey) {
    return true;
  }

  const apiKey = await promptForProviderApiKey(provider);
  if (!apiKey) {
    await vscode.window.showWarningMessage(
      `${metadata.displayName} credentials are required for prompt optimization.`
    );
    return false;
  }

  await configRepo.setProviderApiKey(provider, apiKey);
  return true;
}

export { OPENAI_API_KEY_DETAIL };
