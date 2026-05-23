import * as vscode from 'vscode';
import * as path from 'path';
import { IAudioRecorder } from '../../application/ports/IAudioRecorder';
import { AudioData } from '../../domain/value-objects/AudioData';
import { getAudioFormatFromMimeType } from '../../domain/value-objects/AudioFormat';
import { RecordingState } from '../../domain/value-objects/RecordingState';
import { RecordingError } from '../../domain/errors/RecordingError';
import { PermissionError } from '../../domain/errors/PermissionError';
import { ILogger } from '../../application/ports/ILogger';

export class WebviewAudioRecorder implements IAudioRecorder {
  private panel: vscode.WebviewPanel | null = null;
  private state: RecordingState = RecordingState.IDLE;
  private stateListeners: Array<(state: RecordingState) => void> = [];
  private resolveAudioData: ((audioData: AudioData) => void) | null = null;
  private rejectAudioData: ((error: Error) => void) | null = null;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly logger: ILogger
  ) {}

  async startRecording(): Promise<void> {
    if (this.state !== RecordingState.IDLE) {
      throw new RecordingError('Already recording or processing');
    }

    this.logger.info('Starting webview audio recorder');

    try {
      // Create or show webview panel
      if (!this.panel) {
        this.panel = vscode.window.createWebviewPanel(
          'cursorWhisperRecorder',
          'Cursor Whisper Recorder',
          vscode.ViewColumn.One,
          {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [
              vscode.Uri.file(path.join(this.context.extensionPath, 'out', 'infrastructure', 'audio', 'webview'))
            ]
          }
        );

        // Load HTML content
        this.panel.webview.html = this.getWebviewContent();

        // Handle messages from webview
        this.panel.webview.onDidReceiveMessage(
          message => this.handleWebviewMessage(message),
          undefined,
          this.context.subscriptions
        );

        // Handle panel disposal
        this.panel.onDidDispose(
          () => {
            this.panel = null;
            if (this.state === RecordingState.RECORDING) {
              this.cancelRecording();
            }
          },
          undefined,
          this.context.subscriptions
        );

        // Wait for webview to be ready
        await this.waitForWebviewReady();
      } else {
        // Try to reveal existing panel, but it might be disposed
        try {
          this.panel.reveal(vscode.ViewColumn.One);
        } catch (error) {
          // Panel was disposed, reset and create new one
          this.logger.warn('Panel was disposed, creating new one', error as Error);
          this.panel = null;
          return this.startRecording();
        }
      }

      // Send start command to webview
      await this.panel.webview.postMessage({ type: 'start' });

    } catch (error) {
      this.logger.error('Failed to start recording', error as Error);
      throw new RecordingError(
        'Failed to start recording',
        error instanceof Error ? error : undefined
      );
    }
  }

  async stopRecording(): Promise<AudioData> {
    if (this.state !== RecordingState.RECORDING) {
      throw new RecordingError('No active recording to stop');
    }

    this.logger.info('Stopping recording');

    return new Promise((resolve, reject) => {
      this.resolveAudioData = resolve;
      this.rejectAudioData = reject;

      // Send stop command to webview
      if (this.panel) {
        void this.panel.webview.postMessage({ type: 'stop' });
      } else {
        reject(new RecordingError('Webview panel not available'));
      }

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.rejectAudioData) {
          this.rejectAudioData(new RecordingError('Recording stop timeout'));
          this.resolveAudioData = null;
          this.rejectAudioData = null;
        }
      }, 30000);
    });
  }

  cancelRecording(): void {
    this.logger.info('Cancelling recording');

    if (this.panel) {
      void this.panel.webview.postMessage({ type: 'cancel' });
    }

    if (this.rejectAudioData) {
      this.rejectAudioData(new RecordingError('Recording cancelled'));
      this.resolveAudioData = null;
      this.rejectAudioData = null;
    }

    this.setState(RecordingState.CANCELLED);
    
    // Auto-reset after brief delay
    setTimeout(() => {
      if (this.state === RecordingState.CANCELLED) {
        this.setState(RecordingState.IDLE);
      }
    }, 2000);
  }

  isRecording(): boolean {
    return this.state === RecordingState.RECORDING;
  }

  getState(): RecordingState {
    return this.state;
  }

  onStateChange(callback: (state: RecordingState) => void): void {
    this.stateListeners.push(callback);
  }

  private setState(newState: RecordingState): void {
    this.state = newState;
    this.stateListeners.forEach(listener => listener(newState));
  }

  private async handleWebviewMessage(message: any): Promise<void> {
    switch (message.type) {
      case 'ready':
        this.logger.debug('Webview ready');
        break;

      case 'recordingStarted':
        this.logger.info('Recording started in webview');
        this.setState(RecordingState.RECORDING);
        break;

      case 'audioData':
        await this.handleAudioData(message);
        break;

      case 'cancelled':
        this.logger.info('Recording cancelled in webview');
        this.setState(RecordingState.CANCELLED);
        if (this.rejectAudioData) {
          this.rejectAudioData(new RecordingError('Recording cancelled'));
          this.resolveAudioData = null;
          this.rejectAudioData = null;
        }
        break;

      case 'error':
        this.logger.error('Webview error', new Error(message.error));
        if (message.error.includes('permission')) {
          if (this.rejectAudioData) {
            this.rejectAudioData(new PermissionError('Microphone permission denied'));
            this.resolveAudioData = null;
            this.rejectAudioData = null;
          }
        } else {
          if (this.rejectAudioData) {
            this.rejectAudioData(new RecordingError(message.error));
            this.resolveAudioData = null;
            this.rejectAudioData = null;
          }
        }
        this.setState(RecordingState.ERROR);
        break;
    }
  }

  private async handleAudioData(message: any): Promise<void> {
    try {
      this.logger.info('Received audio data from webview', {
        size: message.data.length,
        mimeType: message.mimeType,
        duration: message.duration
      });

      this.setState(RecordingState.PROCESSING);

      // Convert array back to Buffer
      const buffer = Buffer.from(message.data);

      // Determine audio format from MIME type
      const format = getAudioFormatFromMimeType(message.mimeType);

      // Create AudioData object
      // Note: We use 16000 Hz and mono as configured in the MediaRecorder
      const audioData = new AudioData(
        buffer,
        format,
        16000, // Sample rate
        1      // Mono
      );

      this.logger.info('Audio data processed successfully', {
        size: audioData.getSizeInMB().toFixed(2) + 'MB',
        duration: audioData.getDurationInSeconds().toFixed(2) + 's'
      });

      if (this.resolveAudioData) {
        this.resolveAudioData(audioData);
        this.resolveAudioData = null;
        this.rejectAudioData = null;
      }

      this.setState(RecordingState.IDLE);

    } catch (error) {
      this.logger.error('Failed to process audio data', error as Error);
      if (this.rejectAudioData) {
        this.rejectAudioData(
          new RecordingError(
            'Failed to process audio data',
            error instanceof Error ? error : undefined
          )
        );
        this.resolveAudioData = null;
        this.rejectAudioData = null;
      }
      this.setState(RecordingState.ERROR);
    }
  }

  private async waitForWebviewReady(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Webview initialization timeout'));
      }, 5000);

      const disposable = this.panel!.webview.onDidReceiveMessage(message => {
        if (message.type === 'ready') {
          clearTimeout(timeout);
          disposable.dispose();
          resolve();
        }
      });
    });
  }

  private getWebviewContent(): string {
    // Read the HTML file
    const htmlPath = path.join(
      this.context.extensionPath,
      'out',
      'infrastructure',
      'audio',
      'webview',
      'recorder.html'
    );

    const fs = require('fs');
    return fs.readFileSync(htmlPath, 'utf8');
  }

  dispose(): void {
    if (this.panel) {
      this.panel.dispose();
      this.panel = null;
    }
  }
}
