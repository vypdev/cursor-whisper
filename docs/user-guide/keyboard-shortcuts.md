# Keyboard Shortcuts

Complete reference for Promptimize keyboard shortcuts and Command Palette commands.

---

## Default Keybindings

| Shortcut | Command | Behavior |
|----------|---------|----------|
| `Cmd+Alt+V` (macOS) / `Ctrl+Alt+V` (Windows/Linux) | Start Transcribe Recording | Starts **Transcribe** mode (raw transcription) |
| `Cmd+Alt+P` (macOS) / `Ctrl+Alt+P` (Windows/Linux) | Start Promptimize Recording | Starts **Promptimize** mode (optimized prompt) |
| `Escape` | Cancel Recording | Cancels active recording (while `promptimize.isRecording` is true) |

### Important: Start-only shortcuts

`Cmd/Ctrl+Alt+V` and `Cmd/Ctrl+Alt+P` **start** recording only. They do **not** toggle or stop recording.

To **stop** recording:

1. Click the status bar item showing **Recording...**, or
2. Run the matching stop command from the Command Palette

---

## Command Palette Reference

Open with `Cmd/Ctrl+Shift+P`, then search for **Promptimize**.

### Recording

| Command | Purpose |
|---------|---------|
| `Promptimize: Start Transcribe Recording` | Start raw transcription mode |
| `Promptimize: Stop Transcribe Recording` | Stop and process Transcribe recording |
| `Promptimize: Start Promptimize Recording` | Start optimized prompt mode |
| `Promptimize: Stop Promptimize Recording` | Stop and process Promptimize recording |
| `Promptimize: Cancel Recording` | Discard recording without processing |

### Configuration

| Command | Purpose |
|---------|---------|
| `Promptimize: Setup Wizard` | Opens the configuration panel |
| `Promptimize: Open Configuration` | Opens the configuration webview |
| `Promptimize: Configure OpenAI API Key (Whisper)` | Set OpenAI key for Whisper |
| `Promptimize: Configure Prompt Optimization Provider` | Interactive provider setup wizard |
| `Promptimize: Configure OpenAI Optimization Model` | Pick GPT model (OpenAI provider only) |
| `Promptimize: Test Configuration` | Test Whisper + optimization; opens results webview |

### Deprecated (compatibility)

| Command | Replacement |
|---------|-------------|
| `Promptimize: (Deprecated) Start Recording` | Start Transcribe or Start Promptimize |
| `Promptimize: (Deprecated) Stop Recording` | Stop Transcribe or Stop Promptimize |

---

## Customizing Keybindings

1. Open **Keyboard Shortcuts** (`Cmd/Ctrl+K Cmd/Ctrl+S`)
2. Search for **Promptimize**
3. Click the pencil icon to rebind

Example `keybindings.json` override:

```json
{
  "key": "ctrl+shift+v",
  "command": "promptimize.startTranscribeRecording",
  "when": "editorTextFocus"
}
```

---

## Context Keys

| Context key | When true | Used by |
|-------------|-----------|---------|
| `promptimize.isRecording` | Microphone is actively recording | `Escape` → Cancel Recording |

---

**See also:** [Recording Modes](recording-modes.md) · [Quick Start](../quickstart.md)
