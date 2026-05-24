import * as vscode from 'vscode';
import { StartRecordingUseCase } from '../../application/use-cases/StartRecordingUseCase';
import { IConfigRepository } from '../../application/ports/IConfigRepository';
import { validateConfigurationForTranscription } from '../../application/services/ConfigurationValidationService';
import { PermissionError } from '../../domain/errors/PermissionError';
import { RecordingError } from '../../domain/errors/RecordingError';

export function registerStartTranscribeRecordingCommand(
  _context: vscode.ExtensionContext,
  configRepo: IConfigRepository,
  useCase: StartRecordingUseCase
): vscode.Disposable {
  return vscode.commands.registerCommand('cursor-whisper.startTranscribeRecording', async () => {
    try {
      const validationIssue = await validateConfigurationForTranscription(configRepo);

      if (validationIssue) {
        await vscode.commands.executeCommand('cursor-whisper.openConfigurationPanel');
        return;
      }

      await useCase.execute('transcribe');
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
