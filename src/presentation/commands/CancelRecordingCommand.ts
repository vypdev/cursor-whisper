import * as vscode from 'vscode';
import { CancelRecordingUseCase } from '../../application/use-cases/CancelRecordingUseCase';
import { RecordingError } from '../../domain/errors/RecordingError';
import { setRecordingSessionMode } from '../../shared/services/RecordingSessionMode';

export function registerCancelRecordingCommand(
  _context: vscode.ExtensionContext,
  useCase: CancelRecordingUseCase
): vscode.Disposable {
  return vscode.commands.registerCommand('cursor-whisper.cancelRecording', async () => {
    try {
      useCase.execute();
      setRecordingSessionMode(null);
      await vscode.window.showInformationMessage('Recording cancelled');
    } catch (error) {
      const message =
        error instanceof RecordingError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Unknown error';
      await vscode.window.showErrorMessage(`Failed to cancel recording: ${message}`);
    }
  });
}
