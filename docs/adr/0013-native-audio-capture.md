# ADR-0013: Use Native Audio Capture with @kstonekuan/audio-capture

**Status**: Accepted

**Date**: 2026-05-23

**Deciders**: Core Team

**Related**: [ADR-0005](0005-webview-audio-recording.md), [ADR-0012](0012-mono-audio-16khz.md)

**Supersedes**: [ADR-0005](0005-webview-audio-recording.md)

---

## Context

The initial implementation used a VSCode webview with the browser MediaRecorder API (ADR-0005). In production testing we encountered:

- **Browser permission issues**: Webview reported "Permission denied" without showing a microphone prompt
- **Poor UX**: A visible recorder panel opened on every recording attempt
- **Unnecessary complexity**: HTML assets, message passing, webview lifecycle management
- **Fragile state**: Disposed webview panels caused follow-up recording failures

VS Code and Cursor still do not expose a first-party microphone API for extensions. However, native Node.js addons can capture audio directly from the extension host using OS-level APIs.

Requirements remain unchanged:

- Cross-platform support (macOS, Windows, Linux)
- 16kHz mono PCM output (see ADR-0012)
- WAV-compatible output for OpenAI Whisper
- Clear microphone permission handling
- Minimal user friction

---

## Decision

**We will use `@kstonekuan/audio-capture` as the primary audio capture implementation.**

Key aspects:

- Implement `NativeAudioRecorder` as the default `IAudioRecorder` adapter
- Capture 16kHz 16-bit PCM mono samples via native Rust/cpal bindings
- Encode captured PCM to WAV before transcription
- Keep `WebviewAudioRecorder` in the codebase as a deprecated fallback (not wired by default)
- Package native binaries via optional dependencies and include them in the `.vsix`
- Mark webpack external for `@kstonekuan/audio-capture` so native bindings load at runtime

### Architecture

```
Extension Host (Node.js)
  -> NativeAudioRecorder
  -> @kstonekuan/audio-capture (NAPI-RS)
  -> cpal (OS microphone APIs)
  -> 16kHz PCM mono
  -> WAV encoding
  -> OpenAI Whisper
```

---

## Alternatives Considered

### Alternative 1: Keep Webview + MediaRecorder
- **Description**: Continue using browser APIs inside a webview panel
- **Pros**: Pure JavaScript distribution, no native binaries
- **Cons**: Browser permission prompts unreliable in Cursor, visible panel, complex lifecycle
- **Why not chosen**: Failed in real usage with permission errors and poor UX

### Alternative 2: node-record-lpcm16 + SoX
- **Description**: Spawn SoX/arecord/rec from Node.js
- **Pros**: Mature tooling, widely used in Whisper extensions
- **Cons**: Requires external dependency installation, PATH issues, platform-specific commands
- **Why not chosen**: High user friction compared to bundled native addon

### Alternative 3: @vscode/node-speech
- **Description**: Microsoft native bindings for embedded Azure Speech
- **Pros**: Official Microsoft package, microphone transcription built-in
- **Cons**: Tied to Azure Speech SDK, not designed for OpenAI Whisper workflow
- **Why not chosen**: Wrong integration target for our transcription pipeline

---

## Consequences

### Positive Consequences
- No webview panel required during recording
- OS-level microphone permissions only (System Settings on macOS)
- Simpler implementation (~150 fewer lines than webview approach)
- Output already matches Whisper-friendly 16kHz mono PCM
- Better performance via lock-free ring buffer architecture

### Negative Consequences
- Native binaries per platform increase `.vsix` size
- Must bundle platform-specific optional dependencies in package
- Webpack must externalize the native module
- Native addon compatibility must be validated on each supported OS

### Risks
- **Native module load failure on unsupported platform**
  - **Mitigation**: Pre-built binaries for darwin arm64/x64, linux x64, win32 x64
  - **Mitigation**: Keep deprecated webview implementation for emergency rollback

- **Microphone permission still denied at OS level**
  - **Mitigation**: Surface clear PermissionError with System Settings guidance
  - **Likelihood**: Medium on first use

### Technical Debt
- Deprecated webview code remains until v0.2 cleanup
- ADR-0010 (React webview UI) is partially obsolete for recording flow

---

## Implementation Notes

### Composition Root

```typescript
import { NativeAudioRecorder } from './infrastructure/audio/NativeAudioRecorder';

const audioRecorder = new NativeAudioRecorder(logger);
```

### Packaging

- Add `@kstonekuan/audio-capture` to `dependencies`
- Externalize in `webpack.config.js`
- Update `.vscodeignore` to include `node_modules/@kstonekuan/**`

### Rollback

1. Switch `extension.ts` back to `WebviewAudioRecorder`
2. Mark ADR-0013 as Rejected
3. Restore webview HTML copy step in webpack if needed

---

## References

- [@kstonekuan/audio-capture on npm](https://www.npmjs.com/package/@kstonekuan/audio-capture)
- [kstonekuan/audio-capture GitHub](https://github.com/kstonekuan/audio-capture)
- [ADR-0005: Webview Audio Recording](0005-webview-audio-recording.md)
- [VS Code Webview API](https://code.visualstudio.com/api/extension-guides/webview)
