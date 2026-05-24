import * as vscode from 'vscode';
import { IConfigRepository } from '../../application/ports/IConfigRepository';
import { VSCodeConfigRepository } from '../../infrastructure/configuration/VSCodeConfigRepository';
import {
  OpenAIModelService,
  OpenAIModelServiceError,
} from '../../infrastructure/openai/OpenAIModelService';
import { PromptTransformerFactory } from '../../infrastructure/transformation/PromptTransformerFactory';
import { ILogger } from '../../application/ports/ILogger';
import {
  TransformationProvider,
  PROVIDER_METADATA,
} from '../../domain/value-objects/TransformationProvider';

export function registerConfigureModelCommand(
  _context: vscode.ExtensionContext,
  configRepo: IConfigRepository,
  modelService: OpenAIModelService,
  transformerFactory: PromptTransformerFactory,
  logger: ILogger
): vscode.Disposable {
  return vscode.commands.registerCommand('promptimize.configureModel', async () => {
    const config = await configRepo.getConfig();
    const provider = config.transformationProvider;
    const providerMeta = PROVIDER_METADATA[provider];

    if (provider !== TransformationProvider.OpenAI) {
      const switchProvider = await vscode.window.showInformationMessage(
        `Current optimization provider is ${providerMeta.displayName}. This command configures OpenAI models only. Whisper transcription always uses OpenAI separately.`,
        'Configure Provider',
        'Open Settings'
      );

      if (switchProvider === 'Configure Provider') {
        await vscode.commands.executeCommand('promptimize.configureTransformationProvider');
      } else if (switchProvider === 'Open Settings') {
        await vscode.commands.executeCommand(
          'workbench.action.openSettings',
          'promptimize.transformationProvider'
        );
      }
      return;
    }

    if (!config.apiKey) {
      const configureKey = await vscode.window.showWarningMessage(
        'Configure your OpenAI API key first. It is required for Whisper transcription and OpenAI optimization.',
        'Configure API Key'
      );

      if (configureKey === 'Configure API Key') {
        await vscode.commands.executeCommand('promptimize.configureApiKey');
      }
      return;
    }

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Fetching available GPT models from OpenAI...',
        cancellable: false,
      },
      async () => {
        try {
          const models = await modelService.listGptModels();

          if (models.length === 0) {
            await vscode.window.showWarningMessage(
              'No GPT models were returned for your API key. Check your OpenAI account permissions.'
            );
            return;
          }

          const currentModel =
            config.transformationModel || VSCodeConfigRepository.DEFAULT_TRANSFORMATION_MODEL;

          const selection = await vscode.window.showQuickPick(
            models.map(modelId => ({
              label: modelId,
              description:
                modelId === VSCodeConfigRepository.DEFAULT_TRANSFORMATION_MODEL
                  ? 'Default (GPT-4o)'
                  : modelId === currentModel
                    ? 'Current selection'
                    : undefined,
              picked: modelId === currentModel,
            })),
            {
              placeHolder: 'Select a GPT model for prompt transformation',
              title: 'Promptimize: Configure Model',
            }
          );

          if (!selection) {
            return;
          }

          await configRepo.updateConfig({ transformationModel: selection.label });
          logger.info('Transformation model updated', { model: selection.label });

          const validationError = await transformerFactory.validateProvider(
            TransformationProvider.OpenAI
          );
          if (validationError) {
            await vscode.window.showWarningMessage(validationError);
            return;
          }

          await vscode.window.showInformationMessage(
            `Prompt transformation model set to ${selection.label} (OpenAI optimization; Whisper transcription unchanged).`
          );
        } catch (error) {
          const message =
            error instanceof OpenAIModelServiceError
              ? error.message
              : error instanceof Error
                ? error.message
                : 'Unknown error';

          await vscode.window.showErrorMessage(`Failed to configure model: ${message}`);
        }
      }
    );
  });
}
