import * as vscode from 'vscode';
import { getRecordingSessionMode } from '../../shared/services/RecordingSessionMode';

export function registerStopRecordingCommand(_context: vscode.ExtensionContext): vscode.Disposable {
  return vscode.commands.registerCommand('cursor-whisper.stopRecording', async () => {
    const mode = getRecordingSessionMode() ?? 'promptimize';
    const command =
      mode === 'transcribe'
        ? 'cursor-whisper.stopTranscribeRecording'
        : 'cursor-whisper.stopPromptimizeRecording';

    await vscode.commands.executeCommand(command);
  });
}
