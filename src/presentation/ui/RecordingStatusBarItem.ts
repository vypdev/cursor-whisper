import * as vscode from 'vscode';
import { RecordingState } from '../../domain/value-objects/RecordingState';
import {
  SETUP_CHECKLIST_TOOLTIP,
  STATUS_BAR_SERVICES_TOOLTIP,
} from '../../shared/constants/uxMessages';
import { getRecordingSessionMode, setRecordingSessionMode } from '../../shared/services/RecordingSessionMode';

export interface StatusBarSetupState {
  optimizationEnabled: boolean;
  hasOpenAIKey: boolean;
  setupChecklist?: Array<{ label: string; complete: boolean }>;
}

export class RecordingStatusBarItem {
  private transcribeStatusBarItem: vscode.StatusBarItem;
  private promptimizeStatusBarItem: vscode.StatusBarItem;
  private settingsStatusBarItem: vscode.StatusBarItem;
  private currentState: RecordingState = RecordingState.IDLE;
  private transformationProviderLabel = 'OpenAI';
  private optimizationEnabled = true;
  private hasOpenAIKey = false;
  private setupChecklist: Array<{ label: string; complete: boolean }> = [];

  constructor() {
    this.transcribeStatusBarItem = vscode.window.createStatusBarItem(
      'transcribe',
      vscode.StatusBarAlignment.Right,
      1001
    );
    this.promptimizeStatusBarItem = vscode.window.createStatusBarItem(
      'promptimize',
      vscode.StatusBarAlignment.Right,
      1001
    );
    this.settingsStatusBarItem = vscode.window.createStatusBarItem(
      'settings',
      vscode.StatusBarAlignment.Right,
      1001
    );
    this.settingsStatusBarItem.command = 'promptimize.openConfigurationPanel';
    this.updateUI();
    this.transcribeStatusBarItem.show();
    this.promptimizeStatusBarItem.show();
    this.settingsStatusBarItem.show();
  }

  setState(state: RecordingState): void {
    this.currentState = state;
    if (state === RecordingState.IDLE) {
      setRecordingSessionMode(null);
    }
    this.updateUI();
  }

  setTransformationProviderLabel(label: string): void {
    this.transformationProviderLabel = label;
    this.updateUI();
  }

  setSetupState(state: StatusBarSetupState): void {
    this.optimizationEnabled = state.optimizationEnabled;
    this.hasOpenAIKey = state.hasOpenAIKey;
    this.setupChecklist = state.setupChecklist ?? [];
    this.updateUI();
  }

  private getTranscribeIdleTooltip(): string {
    if (!this.hasOpenAIKey) {
      return 'OpenAI API key required for transcription.\n\nClick to open configuration';
    }

    return `${STATUS_BAR_SERVICES_TOOLTIP(this.transformationProviderLabel, this.optimizationEnabled)}\n\nTranscribe only (no optimization)`;
  }

  private getPromptimizeIdleTooltip(): string {
    if (!this.optimizationEnabled) {
      return 'Prompt optimization is disabled.\n\nClick to open configuration and enable it';
    }

    if (!this.hasOpenAIKey) {
      return 'OpenAI API key required for transcription before optimization.\n\nClick to open configuration';
    }

    return `${STATUS_BAR_SERVICES_TOOLTIP(this.transformationProviderLabel, this.optimizationEnabled)}\n\nTranscribe and optimize prompt`;
  }

  private getSettingsTooltip(): string {
    if (this.setupChecklist.some(item => !item.complete)) {
      return SETUP_CHECKLIST_TOOLTIP(this.setupChecklist);
    }

    return 'Open Promptimize configuration';
  }

  private getSettingsText(): string {
    if (this.setupChecklist.some(item => !item.complete)) {
      return '$(warning) Setup';
    }

    return '$(gear) Settings';
  }

  private updateUI(): void {
    this.settingsStatusBarItem.text = this.getSettingsText();
    this.settingsStatusBarItem.tooltip = this.getSettingsTooltip();

    const sessionMode = getRecordingSessionMode();
    const isActiveSession = sessionMode !== null && this.currentState !== RecordingState.IDLE;

    if (!isActiveSession) {
      this.applyIdleState(this.transcribeStatusBarItem, 'transcribe');
      this.applyIdleState(this.promptimizeStatusBarItem, 'promptimize');
      return;
    }

    if (sessionMode === 'transcribe') {
      this.applySessionState(this.transcribeStatusBarItem, 'transcribe');
      this.applyInactiveSiblingState(this.promptimizeStatusBarItem, 'promptimize');
    } else {
      this.applySessionState(this.promptimizeStatusBarItem, 'promptimize');
      this.applyInactiveSiblingState(this.transcribeStatusBarItem, 'transcribe');
    }
  }

  private applyIdleState(item: vscode.StatusBarItem, mode: 'transcribe' | 'promptimize'): void {
    if (mode === 'transcribe') {
      item.text = '$(mic) Transcribe';
      item.tooltip = this.getTranscribeIdleTooltip();
      item.command = 'promptimize.startTranscribeRecording';
      item.backgroundColor = !this.hasOpenAIKey
        ? new vscode.ThemeColor('statusBarItem.warningBackground')
        : undefined;
      return;
    }

    item.text = '$(sparkle) Promptimize';
    item.tooltip = this.getPromptimizeIdleTooltip();
    item.command = 'promptimize.startPromptimizeRecording';
    item.backgroundColor =
      !this.optimizationEnabled || !this.hasOpenAIKey
        ? new vscode.ThemeColor('statusBarItem.warningBackground')
        : undefined;
  }

  private applyInactiveSiblingState(
    item: vscode.StatusBarItem,
    mode: 'transcribe' | 'promptimize'
  ): void {
    item.text = mode === 'transcribe' ? '$(mic) Transcribe' : '$(sparkle) Promptimize';
    item.tooltip =
      mode === 'transcribe'
        ? 'Transcribe is unavailable while another recording is in progress'
        : 'Promptimize is unavailable while another recording is in progress';
    item.command = undefined;
    item.backgroundColor = undefined;
  }

  private applySessionState(item: vscode.StatusBarItem, mode: 'transcribe' | 'promptimize'): void {
    const stopCommand =
      mode === 'transcribe'
        ? 'promptimize.stopTranscribeRecording'
        : 'promptimize.stopPromptimizeRecording';
    const retryCommand =
      mode === 'transcribe'
        ? 'promptimize.startTranscribeRecording'
        : 'promptimize.startPromptimizeRecording';

    switch (this.currentState) {
      case RecordingState.RECORDING:
        item.text = '$(record) Recording...';
        item.tooltip = 'Click to stop recording';
        item.command = stopCommand;
        item.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
        break;

      case RecordingState.PROCESSING:
        item.text = '$(sync~spin) Processing...';
        item.tooltip = 'Processing audio with OpenAI Whisper';
        item.command = undefined;
        item.backgroundColor = undefined;
        break;

      case RecordingState.TRANSCRIBING:
        item.text = '$(sync~spin) Transcribing...';
        item.tooltip = 'Transcribing with OpenAI Whisper';
        item.command = undefined;
        item.backgroundColor = undefined;
        break;

      case RecordingState.TRANSFORMING:
        item.text = '$(sync~spin) Optimizing...';
        item.tooltip = `Optimizing prompt with ${this.transformationProviderLabel} (Whisper transcription already complete)`;
        item.command = undefined;
        item.backgroundColor = undefined;
        break;

      case RecordingState.INSERTING:
        item.text = '$(sync~spin) Inserting...';
        item.tooltip = 'Inserting text';
        item.command = undefined;
        item.backgroundColor = undefined;
        break;

      case RecordingState.COMPLETED:
        item.text = '$(check) Inserted';
        item.tooltip = 'Prompt inserted successfully';
        item.command = retryCommand;
        item.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        setTimeout(() => {
          if (this.currentState === RecordingState.COMPLETED) {
            this.setState(RecordingState.IDLE);
          }
        }, 2000);
        break;

      case RecordingState.ERROR:
        item.text = '$(x) Error';
        item.tooltip = 'Click to retry';
        item.command = retryCommand;
        item.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
        setTimeout(() => {
          if (this.currentState === RecordingState.ERROR) {
            this.setState(RecordingState.IDLE);
          }
        }, 3000);
        break;

      case RecordingState.CANCELLED:
        item.text = '$(circle-slash) Cancelled';
        item.tooltip = 'Recording cancelled';
        item.command = retryCommand;
        item.backgroundColor = undefined;
        setTimeout(() => {
          if (this.currentState === RecordingState.CANCELLED) {
            this.setState(RecordingState.IDLE);
          }
        }, 2000);
        break;

      default:
        this.applyIdleState(item, mode);
        break;
    }
  }

  dispose(): void {
    this.transcribeStatusBarItem.dispose();
    this.promptimizeStatusBarItem.dispose();
    this.settingsStatusBarItem.dispose();
  }
}
