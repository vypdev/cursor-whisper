import * as vscode from 'vscode';
import { IConfigRepository } from '../../application/ports/IConfigRepository';
import { VSCodeConfigRepository } from '../../infrastructure/configuration/VSCodeConfigRepository';
import {
  OpenAIModelService,
  OpenAIModelServiceError,
} from '../../infrastructure/openai/OpenAIModelService';
import { ILogger } from '../../application/ports/ILogger';

export function registerConfigureModelCommand(
  _context: vscode.ExtensionContext,
  configRepo: IConfigRepository,
  modelService: OpenAIModelService,
  logger: ILogger
): vscode.Disposable {
  return vscode.commands.registerCommand('cursor-whisper.configureModel', async () => {
    const config = await configRepo.getConfig();

    if (!config.apiKey) {
      const configureKey = await vscode.window.showWarningMessage(
        'Cursor Whisper: Configure your OpenAI API key before selecting a model.',
        'Configure API Key'
      );

      if (configureKey === 'Configure API Key') {
        await vscode.commands.executeCommand('cursor-whisper.configureApiKey');
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
              title: 'Cursor Whisper: Configure Model',
            }
          );

          if (!selection) {
            return;
          }

          await configRepo.updateConfig({ transformationModel: selection.label });
          logger.info('Transformation model updated', { model: selection.label });

          await vscode.window.showInformationMessage(
            `Prompt transformation model set to ${selection.label}`
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
