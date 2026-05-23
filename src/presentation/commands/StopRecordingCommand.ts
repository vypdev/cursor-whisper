import * as vscode from 'vscode';
import { StopRecordingUseCase } from '../../application/use-cases/StopRecordingUseCase';
import { TranscribeAudioUseCase } from '../../application/use-cases/TranscribeAudioUseCase';
import { TransformPromptUseCase } from '../../application/use-cases/TransformPromptUseCase';
import { InsertTextUseCase } from '../../application/use-cases/InsertTextUseCase';
import { RecordingError } from '../../domain/errors/RecordingError';
import { TranscriptionError } from '../../domain/errors/TranscriptionError';
import { generateId } from '../../shared/utils/generateId';

interface StopRecordingDependencies {
  stopRecordingUseCase: StopRecordingUseCase;
  transcribeUseCase: TranscribeAudioUseCase;
  transformUseCase: TransformPromptUseCase;
  insertUseCase: InsertTextUseCase;
}

export function registerStopRecordingCommand(
  _context: vscode.ExtensionContext,
  deps: StopRecordingDependencies
): vscode.Disposable {
  return vscode.commands.registerCommand('cursor-whisper.stopRecording', async () => {
    try {
      // Step 1: Stop recording
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Processing audio...',
          cancellable: false,
        },
        async progress => {
          progress.report({ message: 'Stopping recording...' });
          const audioData = await deps.stopRecordingUseCase.execute();

          // Step 2: Transcribe
          progress.report({ message: 'Transcribing...', increment: 25 });
          const recordingId = generateId();
          const transcription = await deps.transcribeUseCase.execute(audioData, recordingId);

          // Step 3: Transform (optional)
          progress.report({ message: 'Optimizing prompt...', increment: 50 });
          const activeEditor = vscode.window.activeTextEditor;
          const context = {
            editorLanguage: activeEditor?.document.languageId,
          };
          const prompt = await deps.transformUseCase.execute(transcription, context);

          // Step 4: Insert
          progress.report({ message: 'Inserting text...', increment: 75 });
          await deps.insertUseCase.execute(prompt.transformedText);

          progress.report({ increment: 100 });
        }
      );

      await vscode.window.showInformationMessage('Prompt inserted successfully');
    } catch (error) {
      if (error instanceof RecordingError) {
        await vscode.window.showErrorMessage(`Recording error: ${error.message}`);
      } else if (error instanceof TranscriptionError) {
        await vscode.window.showErrorMessage(`Transcription failed: ${error.message}`, 'Retry');
      } else {
        await vscode.window.showErrorMessage(
          `Failed to process recording: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
  });
}
