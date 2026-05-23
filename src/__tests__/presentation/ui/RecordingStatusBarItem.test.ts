import { RecordingStatusBarItem } from '../../../presentation/ui/RecordingStatusBarItem';
import { RecordingState } from '../../../domain/value-objects/RecordingState';
import * as vscode from 'vscode';

describe('RecordingStatusBarItem', () => {
  it('uses the active provider label in the transforming tooltip', () => {
    const statusBar = new RecordingStatusBarItem();
    const statusBarItem = (vscode.window.createStatusBarItem as jest.Mock).mock.results[0].value;

    statusBar.setTransformationProviderLabel('Anthropic');
    statusBar.setState(RecordingState.TRANSFORMING);

    expect(statusBarItem.tooltip).toBe('Optimizing prompt with Anthropic');
    statusBar.dispose();
  });
});
