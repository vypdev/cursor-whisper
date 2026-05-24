import * as vscode from 'vscode';
import { RecordingState } from '../../domain/value-objects/RecordingState';
import {
  SETUP_CHECKLIST_TOOLTIP,
  STATUS_BAR_SERVICES_TOOLTIP,
} from '../../shared/constants/uxMessages';

export interface StatusBarSetupState {
  optimizationEnabled: boolean;
  setupIncomplete: boolean;
  setupChecklist?: Array<{ label: string; complete: boolean }>;
}

export class RecordingStatusBarItem {
  private statusBarItem: vscode.StatusBarItem;
  private settingsStatusBarItem: vscode.StatusBarItem;
  private currentState: RecordingState = RecordingState.IDLE;
  private transformationProviderLabel = 'OpenAI';
  private optimizationEnabled = true;
  private setupIncomplete = false;
  private setupChecklist: Array<{ label: string; complete: boolean }> = [];

  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.settingsStatusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      99
    );
    this.settingsStatusBarItem.text = '$(gear)';
    this.settingsStatusBarItem.command = 'cursor-whisper.openConfigurationPanel';
    this.settingsStatusBarItem.tooltip = 'Cursor Whisper configuration';
    this.updateUI();
    this.statusBarItem.show();
    this.settingsStatusBarItem.show();
  }

  setState(state: RecordingState): void {
    this.currentState = state;
    this.updateUI();
  }

  setTransformationProviderLabel(label: string): void {
    this.transformationProviderLabel = label;
    this.updateUI();
  }

  setSetupState(state: StatusBarSetupState): void {
    this.optimizationEnabled = state.optimizationEnabled;
    this.setupIncomplete = state.setupIncomplete;
    this.setupChecklist = state.setupChecklist ?? [];
    this.updateUI();
  }

  private getServicesTooltip(): string {
    if (this.setupIncomplete && this.setupChecklist.length > 0) {
      return SETUP_CHECKLIST_TOOLTIP(this.setupChecklist);
    }

    return STATUS_BAR_SERVICES_TOOLTIP(this.transformationProviderLabel, this.optimizationEnabled);
  }

  private updateUI(): void {
    this.settingsStatusBarItem.tooltip = this.setupIncomplete
      ? SETUP_CHECKLIST_TOOLTIP(this.setupChecklist)
      : 'Open Cursor Whisper configuration';

    switch (this.currentState) {
      case RecordingState.IDLE:
        this.statusBarItem.text = this.setupIncomplete
          ? '$(warning) Setup Whisper'
          : '$(mic) Voice';
        this.statusBarItem.tooltip = this.getServicesTooltip();
        this.statusBarItem.command = this.setupIncomplete
          ? 'cursor-whisper.openConfigurationPanel'
          : 'cursor-whisper.startRecording';
        this.statusBarItem.backgroundColor = this.setupIncomplete
          ? new vscode.ThemeColor('statusBarItem.warningBackground')
          : undefined;
        break;

      case RecordingState.RECORDING:
        this.statusBarItem.text = '$(record) Recording...';
        this.statusBarItem.tooltip = 'Click to stop recording';
        this.statusBarItem.command = 'cursor-whisper.stopRecording';
        this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
        break;

      case RecordingState.PROCESSING:
        this.statusBarItem.text = '$(sync~spin) Processing...';
        this.statusBarItem.tooltip = 'Processing audio with OpenAI Whisper';
        this.statusBarItem.command = undefined;
        this.statusBarItem.backgroundColor = undefined;
        break;

      case RecordingState.TRANSCRIBING:
        this.statusBarItem.text = '$(sync~spin) Transcribing...';
        this.statusBarItem.tooltip = 'Transcribing with OpenAI Whisper';
        this.statusBarItem.command = undefined;
        break;

      case RecordingState.TRANSFORMING:
        this.statusBarItem.text = '$(sync~spin) Optimizing...';
        this.statusBarItem.tooltip = `Optimizing prompt with ${this.transformationProviderLabel} (Whisper transcription already complete)`;
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
        this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
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
    this.settingsStatusBarItem.dispose();
  }
}
