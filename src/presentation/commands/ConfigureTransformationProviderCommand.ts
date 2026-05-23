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

const ANTHROPIC_MODELS = [
  'claude-3-5-sonnet-20241022',
  'claude-3-5-haiku-20241022',
  'claude-3-opus-20240229',
  'claude-3-sonnet-20240229',
  'claude-3-haiku-20240307',
];

const GOOGLE_MODELS = ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.0-flash'];

async function promptForApiKey(provider: TransformationProvider): Promise<string | undefined> {
  const metadata = PROVIDER_METADATA[provider];

  return vscode.window.showInputBox({
    prompt: `Enter your ${metadata.displayName} API key`,
    password: true,
    placeHolder: provider === TransformationProvider.OpenAI ? 'sk-...' : 'API key',
    validateInput: value => {
      if (!value.trim()) {
        return 'API key is required';
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

async function selectModelForProvider(
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
        { placeHolder: 'Select an OpenAI model' }
      );
      return selection?.label;
    }

    case TransformationProvider.Anthropic: {
      const selection = await vscode.window.showQuickPick(
        ANTHROPIC_MODELS.map(modelId => ({
          label: modelId,
          picked: modelId === config.anthropicModel,
        })),
        { placeHolder: 'Select an Anthropic model' }
      );
      return selection?.label;
    }

    case TransformationProvider.Google: {
      const selection = await vscode.window.showQuickPick(
        GOOGLE_MODELS.map(modelId => ({
          label: modelId,
          picked: modelId === config.googleModel,
        })),
        { placeHolder: 'Select a Google Gemini model' }
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
              { placeHolder: 'Select an Ollama model' }
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

async function configureProviderSpecificSettings(
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

export function registerConfigureTransformationProviderCommand(
  _context: vscode.ExtensionContext,
  configRepo: IConfigRepository,
  transformerFactory: PromptTransformerFactory,
  modelService: OpenAIModelService,
  logger: ILogger
): vscode.Disposable {
  return vscode.commands.registerCommand(
    'cursor-whisper.configureTransformationProvider',
    async () => {
      const config = await configRepo.getConfig();

      const providerSelection = await vscode.window.showQuickPick(
        Object.values(PROVIDER_METADATA).map(metadata => ({
          label: metadata.displayName,
          description: metadata.description,
          detail: metadata.id === config.transformationProvider ? 'Current provider' : undefined,
          provider: metadata.id,
        })),
        {
          placeHolder: 'Select a transformation provider',
          title: 'Cursor Whisper: Configure Transformation Provider',
        }
      );

      if (!providerSelection) {
        return;
      }

      const provider = providerSelection.provider;

      await configureProviderSpecificSettings(provider, configRepo);

      const metadata = PROVIDER_METADATA[provider];
      if (metadata.requiresApiKey) {
        const existingKey = await configRepo.getProviderApiKey(provider);
        if (!existingKey) {
          const apiKey = await promptForApiKey(provider);
          if (!apiKey) {
            await vscode.window.showWarningMessage(
              `${metadata.displayName} API key is required to use this provider.`
            );
            return;
          }
          await configRepo.setProviderApiKey(provider, apiKey);
        }
      }

      let selectedModel: string | undefined;
      try {
        if (
          provider === TransformationProvider.OpenAI &&
          !(await configRepo.getProviderApiKey(provider))
        ) {
          await vscode.window.showWarningMessage('Configure your OpenAI API key first.');
          return;
        }

        selectedModel = await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: `Loading models for ${metadata.displayName}...`,
            cancellable: false,
          },
          async () => selectModelForProvider(provider, configRepo, modelService, logger)
        );
      } catch (error) {
        const message =
          error instanceof OpenAIModelServiceError
            ? error.message
            : error instanceof Error
              ? error.message
              : 'Unknown error';
        await vscode.window.showErrorMessage(`Failed to load models: ${message}`);
        return;
      }

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
        await vscode.window.showWarningMessage(
          `Provider set to ${metadata.displayName}, but configuration is incomplete: ${validationError}`
        );
        return;
      }

      logger.info('Transformation provider updated', { provider, model: selectedModel });
      await vscode.window.showInformationMessage(
        `Prompt transformation provider set to ${metadata.displayName}${
          selectedModel ? ` (${selectedModel})` : ''
        }`
      );
    }
  );
}
