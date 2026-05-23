import * as vscode from 'vscode';
import { CancelRecordingUseCase } from '../../application/use-cases/CancelRecordingUseCase';

export function registerCancelRecordingCommand(
  _context: vscode.ExtensionContext,
  useCase: CancelRecordingUseCase
): vscode.Disposable {
  return vscode.commands.registerCommand('cursor-whisper.cancelRecording', () => {
    useCase.execute();
    void vscode.window.showInformationMessage('Recording cancelled');
  });
}
