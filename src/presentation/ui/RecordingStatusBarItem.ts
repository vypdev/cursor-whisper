import * as vscode from 'vscode';
import { RecordingState } from '../../domain/value-objects/RecordingState';

export class RecordingStatusBarItem {
  private statusBarItem: vscode.StatusBarItem;
  private currentState: RecordingState = RecordingState.IDLE;

  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.statusBarItem.command = 'cursor-whisper.startRecording';
    this.updateUI();
    this.statusBarItem.show();
  }

  setState(state: RecordingState): void {
    this.currentState = state;
    this.updateUI();
  }

  private updateUI(): void {
    switch (this.currentState) {
      case RecordingState.IDLE:
        this.statusBarItem.text = '$(mic) Voice';
        this.statusBarItem.tooltip = 'Start recording (Cmd/Ctrl+Alt+V)';
        this.statusBarItem.command = 'cursor-whisper.startRecording';
        this.statusBarItem.backgroundColor = undefined;
        break;

      case RecordingState.RECORDING:
        this.statusBarItem.text = '$(record) Recording...';
        this.statusBarItem.tooltip = 'Click to stop recording';
        this.statusBarItem.command = 'cursor-whisper.stopRecording';
        this.statusBarItem.backgroundColor = new vscode.ThemeColor(
          'statusBarItem.errorBackground'
        );
        break;

      case RecordingState.PROCESSING:
        this.statusBarItem.text = '$(sync~spin) Processing...';
        this.statusBarItem.tooltip = 'Processing audio';
        this.statusBarItem.command = undefined;
        this.statusBarItem.backgroundColor = undefined;
        break;

      case RecordingState.TRANSCRIBING:
        this.statusBarItem.text = '$(sync~spin) Transcribing...';
        this.statusBarItem.tooltip = 'Transcribing with Whisper';
        this.statusBarItem.command = undefined;
        break;

      case RecordingState.TRANSFORMING:
        this.statusBarItem.text = '$(sync~spin) Optimizing...';
        this.statusBarItem.tooltip = 'Optimizing prompt with GPT-4';
        this.statusBarItem.command = undefined;
        break;

      case RecordingState.INSERTING:
        this.statusBarItem.text = '$(sync~spin) Inserting...';
        this.statusBarItem.tooltip = 'Inserting text';
        this.statusBarItem.command = undefined;
        break;

      case RecordingState.COMPLETED:
        this.statusBarItem.text = '$(check) Inserted';
        this.statusBarItem.tooltip = 'Prompt inserted successfully';
        this.statusBarItem.command = 'cursor-whisper.startRecording';
        this.statusBarItem.backgroundColor = new vscode.ThemeColor(
          'statusBarItem.warningBackground'
        );
        // Auto-reset after 2 seconds
        setTimeout(() => {
          if (this.currentState === RecordingState.COMPLETED) {
            this.setState(RecordingState.IDLE);
          }
        }, 2000);
        break;

      case RecordingState.ERROR:
        this.statusBarItem.text = '$(x) Error';
        this.statusBarItem.tooltip = 'Click to retry';
        this.statusBarItem.command = 'cursor-whisper.startRecording';
        this.statusBarItem.backgroundColor = new vscode.ThemeColor(
          'statusBarItem.errorBackground'
        );
        // Auto-reset after 3 seconds
        setTimeout(() => {
          if (this.currentState === RecordingState.ERROR) {
            this.setState(RecordingState.IDLE);
          }
        }, 3000);
        break;

      case RecordingState.CANCELLED:
        this.statusBarItem.text = '$(circle-slash) Cancelled';
        this.statusBarItem.tooltip = 'Recording cancelled';
        this.statusBarItem.command = 'cursor-whisper.startRecording';
        // Auto-reset after 2 seconds
        setTimeout(() => {
          if (this.currentState === RecordingState.CANCELLED) {
            this.setState(RecordingState.IDLE);
          }
        }, 2000);
        break;
    }
  }

  dispose(): void {
    this.statusBarItem.dispose();
  }
}
