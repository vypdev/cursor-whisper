import * as vscode from 'vscode';
import { StartRecordingUseCase } from '../../application/use-cases/StartRecordingUseCase';
import { PermissionError } from '../../domain/errors/PermissionError';
import { ConfigError, MissingApiKeyError } from '../../domain/errors/ConfigError';
import { RecordingError } from '../../domain/errors/RecordingError';

export function registerStartRecordingCommand(
  _context: vscode.ExtensionContext,
  useCase: StartRecordingUseCase
): vscode.Disposable {
  return vscode.commands.registerCommand('cursor-whisper.startRecording', async () => {
    try {
      await useCase.execute();
      await vscode.window.showInformationMessage('Recording started');
    } catch (error) {
      if (error instanceof MissingApiKeyError) {
        const selection = await vscode.window.showErrorMessage(
          'OpenAI API key is required for Whisper voice-to-text transcription.',
          { detail: 'Prompt optimization uses a separate provider you can configure later.' },
          'Configure Now',
          'Open Configuration'
        );

        if (selection === 'Configure Now') {
          await vscode.commands.executeCommand('cursor-whisper.configureApiKey');
        } else if (selection === 'Open Configuration') {
          await vscode.commands.executeCommand('cursor-whisper.openConfigurationPanel');
        }
      } else if (error instanceof ConfigError) {
        await vscode.window.showErrorMessage(`Configuration error: ${error.message}`);
      } else if (error instanceof PermissionError) {
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
