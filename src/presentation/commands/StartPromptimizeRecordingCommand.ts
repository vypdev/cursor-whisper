import * as vscode from 'vscode';
import { StartRecordingUseCase } from '../../application/use-cases/StartRecordingUseCase';
import { IConfigRepository } from '../../application/ports/IConfigRepository';
import { ITransformationProviderValidator } from '../../application/ports/ITransformationProviderValidator';
import { validateConfigurationForPromptimize } from '../../application/services/ConfigurationValidationService';
import { PermissionError } from '../../domain/errors/PermissionError';
import { RecordingError } from '../../domain/errors/RecordingError';

export function registerStartPromptimizeRecordingCommand(
  _context: vscode.ExtensionContext,
  configRepo: IConfigRepository,
  providerValidator: ITransformationProviderValidator,
  useCase: StartRecordingUseCase
): vscode.Disposable {
  return vscode.commands.registerCommand('promptimize.startPromptimizeRecording', async () => {
    try {
      const validationIssue = await validateConfigurationForPromptimize(
        configRepo,
        providerValidator
      );

      if (validationIssue) {
        await vscode.commands.executeCommand('promptimize.openConfigurationPanel');
        return;
      }

      await useCase.execute('promptimize');
      await vscode.window.showInformationMessage('Recording started');
    } catch (error) {
      if (error instanceof PermissionError) {
        await vscode.window.showErrorMessage(
          'Microphone permission denied. Please check system settings.',
          'OK'
        );
      } else if (error instanceof RecordingError) {
        await vscode.window.showErrorMessage(`Recording failed: ${error.message}`);
      } else {
        await vscode.window.showErrorMessage(
          `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
  });
}
