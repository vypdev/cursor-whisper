# Keyboard Shortcuts

Complete reference for Cursor Whisper keyboard shortcuts and Command Palette commands.

---

## Default Keybindings

| Shortcut | Command | Behavior |
|----------|---------|----------|
| `Cmd+Alt+V` (macOS) / `Ctrl+Alt+V` (Windows/Linux) | Start Transcribe Recording | Starts **Transcribe** mode (raw transcription) |
| `Cmd+Alt+P` (macOS) / `Ctrl+Alt+P` (Windows/Linux) | Start Promptimize Recording | Starts **Promptimize** mode (optimized prompt) |
| `Escape` | Cancel Recording | Cancels active recording (while `cursorWhisper.isRecording` is true) |

### Important: Start-only shortcuts

`Cmd/Ctrl+Alt+V` and `Cmd/Ctrl+Alt+P` **start** recording only. They do **not** toggle or stop recording.

To **stop** recording:

1. Click the status bar item showing **Recording...**, or
2. Run the matching stop command from the Command Palette

---

## Command Palette Reference

Open with `Cmd/Ctrl+Shift+P`, then search for **Cursor Whisper**.

### Recording

| Command | Purpose |
|---------|---------|
| `Cursor Whisper: Start Transcribe Recording` | Start raw transcription mode |
| `Cursor Whisper: Stop Transcribe Recording` | Stop and process Transcribe recording |
| `Cursor Whisper: Start Promptimize Recording` | Start optimized prompt mode |
| `Cursor Whisper: Stop Promptimize Recording` | Stop and process Promptimize recording |
| `Cursor Whisper: Cancel Recording` | Discard recording without processing |

### Configuration

| Command | Purpose |
|---------|---------|
| `Cursor Whisper: Setup Wizard` | Opens the configuration panel |
| `Cursor Whisper: Open Configuration` | Opens the configuration webview |
| `Cursor Whisper: Configure OpenAI API Key (Whisper)` | Set OpenAI key for Whisper |
| `Cursor Whisper: Configure Prompt Optimization Provider` | Interactive provider setup wizard |
| `Cursor Whisper: Configure OpenAI Optimization Model` | Pick GPT model (OpenAI provider only) |
| `Cursor Whisper: Test Configuration` | Test Whisper + optimization; opens results webview |

### Deprecated (compatibility)

| Command | Replacement |
|---------|-------------|
| `Cursor Whisper: (Deprecated) Start Recording` | Start Transcribe or Start Promptimize |
| `Cursor Whisper: (Deprecated) Stop Recording` | Stop Transcribe or Stop Promptimize |

---

## Customizing Keybindings

1. Open **Keyboard Shortcuts** (`Cmd/Ctrl+K Cmd/Ctrl+S`)
2. Search for **Cursor Whisper**
3. Click the pencil icon to rebind

Example `keybindings.json` override:

```json
{
  "key": "ctrl+shift+v",
  "command": "cursor-whisper.startTranscribeRecording",
  "when": "editorTextFocus"
}
```

---

## Context Keys

| Context key | When true | Used by |
|-------------|-----------|---------|
| `cursorWhisper.isRecording` | Microphone is actively recording | `Escape` → Cancel Recording |

---

**See also:** [Recording Modes](recording-modes.md) · [Quick Start](../quickstart.md)
