import * as vscode from 'vscode';
import { getRecordingSessionMode } from '../../shared/services/RecordingSessionMode';

export function registerStopRecordingCommand(_context: vscode.ExtensionContext): vscode.Disposable {
  return vscode.commands.registerCommand('promptimize.stopRecording', async () => {
    const mode = getRecordingSessionMode() ?? 'promptimize';
    const command =
      mode === 'transcribe'
        ? 'promptimize.stopTranscribeRecording'
        : 'promptimize.stopPromptimizeRecording';

    await vscode.commands.executeCommand(command);
  });
}
