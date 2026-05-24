import { RecordingStatusBarItem } from '../../../presentation/ui/RecordingStatusBarItem';
import { RecordingState } from '../../../domain/value-objects/RecordingState';
import * as vscode from 'vscode';
import {
  getRecordingSessionMode,
  setRecordingSessionMode,
} from '../../../shared/services/RecordingSessionMode';

function getStatusBarItems(): Array<{
  text: string;
  command?: string;
  tooltip?: string;
  backgroundColor?: unknown;
}> {
  return (vscode.window.createStatusBarItem as jest.Mock).mock.results.map(result => result.value);
}

describe('RecordingStatusBarItem', () => {
  beforeEach(() => {
    setRecordingSessionMode(null);
  });

  it('creates transcribe and promptimize buttons with idle labels', () => {
    const statusBar = new RecordingStatusBarItem();
    const [transcribeItem, promptimizeItem, settingsItem] = getStatusBarItems();

    expect(vscode.window.createStatusBarItem).toHaveBeenNthCalledWith(
      1,
      'transcribe',
      vscode.StatusBarAlignment.Right,
      1001
    );
    expect(vscode.window.createStatusBarItem).toHaveBeenNthCalledWith(
      2,
      'promptimize',
      vscode.StatusBarAlignment.Right,
      1001
    );
    expect(vscode.window.createStatusBarItem).toHaveBeenNthCalledWith(
      3,
      'settings',
      vscode.StatusBarAlignment.Right,
      1001
    );
    expect(transcribeItem.text).toBe('$(mic) Transcribe');
    expect(transcribeItem.command).toBe('promptimize.startTranscribeRecording');
    expect(promptimizeItem.text).toBe('$(sparkle) Promptimize');
    expect(promptimizeItem.command).toBe('promptimize.startPromptimizeRecording');
    expect(settingsItem.text).toBe('$(gear) Settings');
    expect(settingsItem.command).toBe('promptimize.openConfigurationPanel');
    statusBar.dispose();
  });

  it('uses the active provider label in the transforming tooltip', () => {
    const statusBar = new RecordingStatusBarItem();
    const promptimizeItem = getStatusBarItems()[1];

    statusBar.setSetupState({
      optimizationEnabled: true,
      hasOpenAIKey: true,
    });
    statusBar.setTransformationProviderLabel('Anthropic');
    setRecordingSessionMode('promptimize');
    statusBar.setState(RecordingState.TRANSFORMING);

    expect(promptimizeItem.tooltip).toBe(
      'Optimizing prompt with Anthropic (Whisper transcription already complete)'
    );
    statusBar.dispose();
  });

  it('shows configuration tooltip when OpenAI key is missing', () => {
    const statusBar = new RecordingStatusBarItem();
    const transcribeItem = getStatusBarItems()[0];

    statusBar.setSetupState({
      optimizationEnabled: true,
      hasOpenAIKey: false,
    });
    statusBar.setState(RecordingState.IDLE);

    expect(transcribeItem.text).toBe('$(mic) Transcribe');
    expect(transcribeItem.command).toBe('promptimize.startTranscribeRecording');
    expect(transcribeItem.tooltip).toContain('OpenAI API key required');
    expect(transcribeItem.backgroundColor).toEqual({
      id: 'statusBarItem.warningBackground',
    });
    statusBar.dispose();
  });

  it('shows configuration tooltip when optimization is disabled', () => {
    const statusBar = new RecordingStatusBarItem();
    const promptimizeItem = getStatusBarItems()[1];

    statusBar.setSetupState({
      optimizationEnabled: false,
      hasOpenAIKey: true,
    });
    statusBar.setState(RecordingState.IDLE);

    expect(promptimizeItem.text).toBe('$(sparkle) Promptimize');
    expect(promptimizeItem.command).toBe('promptimize.startPromptimizeRecording');
    expect(promptimizeItem.tooltip).toContain('Prompt optimization is disabled');
    statusBar.dispose();
  });

  it('shows setup label when configuration checklist is incomplete', () => {
    const statusBar = new RecordingStatusBarItem();
    const settingsItem = getStatusBarItems()[2];

    statusBar.setSetupState({
      optimizationEnabled: true,
      hasOpenAIKey: false,
      setupChecklist: [
        { label: 'OpenAI API key', complete: false },
        { label: 'Optimization provider', complete: true },
      ],
    });

    expect(settingsItem.text).toBe('$(warning) Setup');
    statusBar.dispose();
  });

  it('disables sibling button while a transcribe session is active', () => {
    const statusBar = new RecordingStatusBarItem();
    const [transcribeItem, promptimizeItem] = getStatusBarItems();

    statusBar.setSetupState({
      optimizationEnabled: true,
      hasOpenAIKey: true,
    });
    setRecordingSessionMode('transcribe');
    statusBar.setState(RecordingState.RECORDING);

    expect(transcribeItem.command).toBe('promptimize.stopTranscribeRecording');
    expect(promptimizeItem.command).toBeUndefined();
    expect(getRecordingSessionMode()).toBe('transcribe');
    statusBar.dispose();
  });
});
