# ADR-0005: Use Webview with MediaRecorder for Audio Capture

**Status**: Superseded by [ADR-0013](0013-native-audio-capture.md)

**Date**: 2026-05-23

**Deciders**: Core Team

**Related**: [ADR-0003](0003-openai-whisper.md), [ADR-0010](0010-react-for-ui.md), [ADR-0013](0013-native-audio-capture.md)

---

## Supersession Notice

This ADR was superseded on 2026-05-23 by [ADR-0013](0013-native-audio-capture.md).

The webview-based approach was replaced because:
- Browser microphone permissions were unreliable inside Cursor webviews
- The recorder panel added unnecessary UX friction
- Native capture via `@kstonekuan/audio-capture` provides simpler, more reliable OS-level access

The original decision is preserved below for historical context.

---

## Context

We need to capture audio from the user's microphone for transcription. VSCode extensions run in a Node.js environment, which doesn't have native access to browser APIs like `MediaRecorder`.

Options for audio capture:
1. **Webview with browser APIs** - Use VSCode webview to access MediaRecorder
2. **Native Node modules** - Use node-mic, node-record-lpcm16, etc.
3. **External tools** - Shell out to sox, ffmpeg, etc.
4. **VSCode API** - No audio recording API exists

Requirements:
- **Cross-platform**: macOS, Windows, Linux
- **Quality**: 16kHz mono sufficient for speech
- **Format**: WAV or compatible with Whisper
- **Permissions**: Handle microphone permissions gracefully
- **User experience**: Visual feedback during recording
- **Reliability**: Works consistently across platforms

---

## Decision

**We will use a VSCode Webview with the browser's MediaRecorder API for audio capture.**

Key aspects:
- Webview hosts React UI for recording interface
- MediaRecorder captures audio in browser context
- Audio processed with Web Audio API
- Convert to WAV format before sending to Node side
- Message passing between webview and extension
- Fallback to Node-based recording if webview fails

### Architecture

```
┌─────────────────────────────────────────┐
│           VSCode Extension              │
│              (Node.js)                  │
│  ┌────────────────────────────────┐    │
│  │   StartRecordingUseCase        │    │
│  └──────────┬─────────────────────┘    │
│             │                           │
│             │ postMessage               │
│             ▼                           │
│  ┌────────────────────────────────┐    │
│  │   Webview Panel Provider       │    │
│  └──────────┬─────────────────────┘    │
└─────────────┼─────────────────────────┘
              │
              │ messages
              │
┌─────────────▼─────────────────────────┐
│            Webview                     │
│         (Browser Context)              │
│  ┌────────────────────────────────┐   │
│  │   MediaRecorder API            │   │
│  │   getUserMedia()               │   │
│  │   Web Audio API                │   │
│  │   React UI Components          │   │
│  └────────────────────────────────┘   │
└────────────────────────────────────────┘
```

---

## Alternatives Considered

### Alternative 1: node-mic / node-record-lpcm16
- **Description**: Use Node.js native modules for audio recording
- **Pros**:
  - No webview needed
  - Direct Node.js integration
  - Potentially lower latency
- **Cons**:
  - Native modules need compilation per platform
  - Distribution complexity (native binaries)
  - Harder to debug
  - Microphone permission handling tricky
  - Limited browser-based testing tools
  - Maintenance burden
- **Why not chosen**: Distribution complexity, platform-specific builds

### Alternative 2: Shell out to sox/ffmpeg
- **Description**: Execute external audio capture tools
- **Pros**:
  - Powerful audio processing
  - Well-tested tools
  - Flexible format support
- **Cons**:
  - Requires users to install external dependencies
  - Different commands per platform
  - PATH configuration issues
  - Security concerns (executing shell commands)
  - Poor user experience (installation friction)
- **Why not chosen**: Requires external dependencies, poor UX

### Alternative 3: Wait for VSCode Audio API
- **Description**: Wait for VSCode to provide native audio recording API
- **Pros**:
  - Official, supported solution
  - No webview needed
  - Best integration
- **Cons**:
  - **No such API exists**
  - No roadmap for it
  - Indefinite wait
  - Project blocked
- **Why not chosen**: API doesn't exist, no timeline

### Alternative 4: Electron IPC to Main Process
- **Description**: Use Electron's main process for audio capture
- **Pros**:
  - Direct hardware access
  - No webview needed
- **Cons**:
  - VSCode extensions don't have access to Electron main process
  - Would only work in VSCode, not web version
  - Not part of extension API contract
  - Fragile, could break with VSCode updates
- **Why not chosen**: Not part of public extension API

---

## Consequences

### Positive Consequences
- **Browser APIs available**: MediaRecorder, getUserMedia, Web Audio all work
- **Cross-platform**: Browser APIs work uniformly across OS
- **No native modules**: No compilation, no platform-specific binaries
- **Easy distribution**: Just JavaScript, part of `.vsix`
- **Rich UI**: Can build React components for recording interface
- **Testable**: Can test in browser developer tools
- **Permissions handling**: Browser handles microphone permissions natively
- **Modern APIs**: Access to latest web audio features

### Negative Consequences
- **Webview overhead**: Slight performance overhead
- **Message passing**: Need to pass audio data from webview to extension
- **Complexity**: More moving parts than native Node solution
- **Webview limitations**: Subject to webview security policies
- **Format conversion**: Need to convert audio formats for Whisper

### Risks
- **Webview availability**: VSCode webview might not be available
  - **Mitigation**: Fallback to clipboard-only mode
  - **Mitigation**: Check webview support on activation
  - **Likelihood**: Very low (webviews are core to VSCode)

- **Audio format issues**: Browser might encode in unsupported format
  - **Mitigation**: Convert to WAV using Web Audio API
  - **Mitigation**: Test common formats (webm, ogg, mp4)
  - **Likelihood**: Medium (handled by conversion)

- **Large audio files**: Audio data might be too large for message passing
  - **Mitigation**: Limit recording duration (120s default)
  - **Mitigation**: Use ArrayBuffer for efficient transfer
  - **Likelihood**: Low (typical recordings are <5MB)

- **Microphone permissions**: User denies permission
  - **Mitigation**: Show clear error with instructions
  - **Mitigation**: Platform-specific permission guides
  - **Likelihood**: Medium (first-time use)

### Technical Debt
- **Webview dependency**: Tightly coupled to webview
  - **Payoff strategy**: Abstract behind IAudioRecorder interface
  - **Timeline**: Refactor if Node-based solution becomes viable

---

## Implementation Notes

### WebView Setup

```typescript
export class RecordingPanel {
  public static currentPanel: RecordingPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._panel.webview.options = {
      enableScripts: true,
      localResourceRoots: [extensionUri]
    };
    
    this._setHtmlContent();
    this._setMessageListener();
  }

  public static createOrShow(extensionUri: vscode.Uri) {
    if (RecordingPanel.currentPanel) {
      RecordingPanel.currentPanel._panel.reveal();
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'promptimizeRecording',
      'Voice Recording',
      vscode.ViewColumn.Beside,
      { enableScripts: true }
    );

    RecordingPanel.currentPanel = new RecordingPanel(panel, extensionUri);
  }

  private _setMessageListener() {
    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case 'audioData':
            await this.handleAudioData(message.data);
            break;
          case 'recordingStarted':
            this.handleRecordingStarted();
            break;
          case 'error':
            this.handleError(message.error);
            break;
        }
      }
    );
  }
}
```

### MediaRecorder in Webview

```typescript
// In webview script
class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];

  async startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,       // Mono
        sampleRate: 16000,     // 16kHz sufficient for speech
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });

    this.mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus',  // Most compatible
      audioBitsPerSecond: 128000
    });

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.mediaRecorder.start(100);  // Collect data every 100ms
    vscode.postMessage({ command: 'recordingStarted' });
  }

  async stopRecording() {
    return new Promise<AudioBuffer>((resolve) => {
      this.mediaRecorder!.onstop = async () => {
        const audioBlob = new Blob(this.audioChunks, {
          type: this.mediaRecorder!.mimeType
        });

        // Convert to WAV
        const wavBlob = await this.convertToWav(audioBlob);
        const arrayBuffer = await wavBlob.arrayBuffer();

        // Send to extension
        vscode.postMessage({
          command: 'audioData',
          data: Array.from(new Uint8Array(arrayBuffer))
        });

        resolve();
      };

      this.mediaRecorder!.stop();
      this.stream.getTracks().forEach(track => track.stop());
    });
  }

  private async convertToWav(blob: Blob): Promise<Blob> {
    const audioContext = new AudioContext({ sampleRate: 16000 });
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    const wavBuffer = this.audioBufferToWav(audioBuffer);
    return new Blob([wavBuffer], { type: 'audio/wav' });
  }

  private audioBufferToWav(audioBuffer: AudioBuffer): ArrayBuffer {
    // WAV encoding logic (full implementation in codebase)
    // ...
    return wavArrayBuffer;
  }
}
```

### IAudioRecorder Implementation

```typescript
export class WebviewAudioRecorder implements IAudioRecorder {
  constructor(
    private webviewPanel: RecordingPanel,
    private permissionManager: MicrophonePermissionManager,
    private logger: ILogger
  ) {}

  async startRecording(): Promise<void> {
    // Check permissions
    const hasPermission = await this.permissionManager.requestPermission();
    if (!hasPermission) {
      throw new PermissionError('Microphone permission denied');
    }

    // Send message to webview
    this.webviewPanel.postMessage({ command: 'startRecording' });
  }

  async stopRecording(): Promise<AudioData> {
    // Send message to webview
    this.webviewPanel.postMessage({ command: 'stopRecording' });

    // Wait for audioData message
    return this.waitForAudioData();
  }

  private waitForAudioData(): Promise<AudioData> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new TimeoutError('Audio data not received'));
      }, 30000);  // 30s timeout

      this.onAudioDataReceived = (data: AudioData) => {
        clearTimeout(timeout);
        resolve(data);
      };
    });
  }
}
```

---

## References

- [MDN MediaRecorder API](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)
- [MDN getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)
- [VSCode Webview API](https://code.visualstudio.com/api/extension-guides/webview)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
