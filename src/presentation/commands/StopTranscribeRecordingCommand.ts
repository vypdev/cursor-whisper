import * as vscode from 'vscode';
import { StopRecordingUseCase } from '../../application/use-cases/StopRecordingUseCase';
import { TranscribeAudioUseCase } from '../../application/use-cases/TranscribeAudioUseCase';
import { InsertTextUseCase } from '../../application/use-cases/InsertTextUseCase';
import { RecordingError } from '../../domain/errors/RecordingError';
import { TranscriptionError } from '../../domain/errors/TranscriptionError';
import { PermissionError } from '../../domain/errors/PermissionError';
import { ConfigError } from '../../domain/errors/ConfigError';
import { InsertionError } from '../../application/use-cases/InsertTextUseCase';
import { generateId } from '../../shared/utils/generateId';

interface StopTranscribeRecordingDependencies {
  stopRecordingUseCase: StopRecordingUseCase;
  transcribeUseCase: TranscribeAudioUseCase;
  insertUseCase: InsertTextUseCase;
}

export function registerStopTranscribeRecordingCommand(
  _context: vscode.ExtensionContext,
  deps: StopTranscribeRecordingDependencies
): vscode.Disposable {
  return vscode.commands.registerCommand('promptimize.stopTranscribeRecording', async () => {
    try {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Processing audio...',
          cancellable: false,
        },
        async progress => {
          progress.report({ message: 'Stopping recording...' });
          const audioData = await deps.stopRecordingUseCase.execute();

          progress.report({ message: 'Transcribing...', increment: 40 });
          const recordingId = generateId();
          const transcription = await deps.transcribeUseCase.execute(audioData, recordingId);

          progress.report({ message: 'Inserting text...', increment: 80 });
          await deps.insertUseCase.execute(transcription.text);

          progress.report({ increment: 100 });
        }
      );

      await vscode.window.showInformationMessage('Transcription inserted successfully');
    } catch (error) {
      if (error instanceof RecordingError) {
        await vscode.window.showErrorMessage(`Recording error: ${error.message}`);
      } else if (error instanceof TranscriptionError) {
        const action = await vscode.window.showErrorMessage(
          `Transcription failed: ${error.message}`,
          'Retry'
        );
        if (action === 'Retry') {
          await vscode.commands.executeCommand('promptimize.stopTranscribeRecording');
        }
      } else if (error instanceof InsertionError) {
        await vscode.window.showErrorMessage(
          `Could not insert text: ${error.message}. Check clipboard fallback.`
        );
      } else if (error instanceof PermissionError) {
        await vscode.window.showErrorMessage(
          `Microphone permission denied: ${error.message}`,
          'Open Settings'
        );
      } else if (error instanceof ConfigError) {
        await vscode.window.showErrorMessage(`Configuration error: ${error.message}`);
      } else {
        await vscode.window.showErrorMessage(
          `Failed to process recording: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
  });
}
