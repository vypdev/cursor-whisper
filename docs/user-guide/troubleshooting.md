# Troubleshooting

Decision trees and fixes for common Promptimize issues.

---

## Recording Won't Start

```mermaid
flowchart TD
    A[Recording won't start] --> B{OpenAI key configured?}
    B -->|No| C[Open Configuration panel<br/>Enter sk-... key]
    B -->|Yes| D{Which mode?}
    D -->|Promptimize| E{Optimization enabled?}
    E -->|No| F[Enable in config panel<br/>or use Transcribe mode]
    E -->|Yes| G{Provider configured?}
    G -->|No| H[Complete provider setup<br/>in config panel]
    G -->|Yes| I{Microphone permission?}
    D -->|Transcribe| I
    I -->|Denied| J[Enable mic for VS Code/Cursor<br/>in OS settings]
    I -->|Granted| K[Check Output channel<br/>Promptimize for errors]
```

### Quick checks

1. Status bar shows $(warning) **Setup** → click to open configuration
2. **Transcribe** requires OpenAI key only
3. **Promptimize** requires OpenAI key + optimization enabled + provider credentials

---

## Transcription Fails

```mermaid
flowchart TD
    A[Transcription failed] --> B{API key valid?}
    B -->|Unknown| C[Run Test Configuration<br/>or Test in config panel]
    B -->|Invalid| D[Re-enter key at platform.openai.com]
    B -->|Valid| E{OpenAI credits?}
    E -->|No| F[Add billing at OpenAI dashboard]
    E -->|Yes| G{Audio length?}
    G -->|Too short| H[Record at least 0.5 seconds]
    G -->|Too long| I[Keep under 5 minutes / 25 MB]
    G -->|OK| J{Rate limit 429?}
    J -->|Yes| K[Wait and click Retry]
    J -->|No| L[Check network / firewall]
```

### Error actions

- Transcription errors show a **Retry** button in the notification
- Verify key starts with `sk-`
- Check credits: https://platform.openai.com/account/billing

---

## Optimization Fails (Promptimize)

```mermaid
flowchart TD
    A[Optimization failed] --> B{Whisper working?}
    B -->|No| C[Fix Whisper first]
    B -->|Yes| D{Provider type?}
    D -->|Cloud API| E{API key correct?}
    E -->|No| F[Re-enter provider key<br/>in config panel]
    E -->|Yes| G{Account credits?}
    G -->|No| H[Top up provider account]
    D -->|Ollama| I{Server running?}
    I -->|No| J[Start Ollama<br/>ollama serve]
    I -->|Yes| K{Model pulled?}
    K -->|No| L[ollama pull model-name]
    D -->|OpenCode| M{Proxy reachable?}
    M -->|No| N[Start opencode-llm-proxy<br/>Check base URL]
    D -->|Azure| O{Endpoint + deployment?}
    O -->|Wrong| P[Use deployment name<br/>not model ID]
```

**Note:** If optimization fails during recording, the extension **falls back to raw transcription** and still inserts text. You may not see an optimization error if insertion succeeds.

---

## Text Not Inserting

```mermaid
flowchart TD
    A[Text not appearing] --> B{Active editor or chat?}
    B -->|No| C[Focus editor or chat input<br/>before recording]
    B -->|Yes| D{Check clipboard}
    D -->|Text there| E[Fallback worked<br/>Paste manually]
    D -->|Empty| F{Status bar error?}
    F -->|Insertion error| G[Open editor tab<br/>Try again]
    F -->|None| H[Check Output channel<br/>Promptimize]
```

### Insertion priority

1. **Cursor chat** — `composer.focusComposer` + paste
2. **VS Code chat** — `workbench.action.chat.open` with query
3. **Active editor** — Insert at cursor
4. **Clipboard fallback** — Copies text + shows notification

---

## Microphone Not Working

| Platform | Fix |
|----------|-----|
| **macOS** | System Settings → Privacy & Security → Microphone → enable Cursor/VS Code |
| **Windows** | Settings → Privacy → Microphone → enable Cursor/VS Code |
| **Linux** | Usually automatic; check `pavucontrol` if using PulseAudio |

Restart the editor after granting permission.

---

## Escape Doesn't Cancel

`Escape` cancels recording only while actively recording (`promptimize.isRecording` context).

If Escape doesn't work:

1. Click the status bar **Recording...** item and use **Cancel Recording** from Command Palette
2. Reload the window after updating the extension

---

## Deprecated Commands

If scripts or keybindings use old commands:

| Old | New |
|-----|-----|
| `promptimize.startRecording` | `startTranscribeRecording` or `startPromptimizeRecording` |
| `promptimize.stopRecording` | `stopTranscribeRecording` or `stopPromptimizeRecording` |

---

## API Key Migration (Upgrading)

The extension migrates legacy secret storage keys automatically:

| Legacy key | Current key |
|------------|-------------|
| `openai-api-key` | `promptimize.apiKey.openai` |
| `promptimize.openai.apiKey` | `promptimize.apiKey.openai` |

If keys seem missing after upgrade, re-enter via **Open Configuration** panel.

---

## Settings Not Taking Effect

| Setting | Status |
|---------|--------|
| `transcriptionLanguage` | ✅ Applied |
| `transcriptionHint` | ✅ Applied |
| `transformationSystemPrompt` | ✅ Applied |
| `audioQuality` | ⏳ Planned — not applied yet |
| `maxRecordingDuration` | ⏳ Planned — not applied yet |
| `showNotifications` | ⏳ Planned — not applied yet |

See [Advanced Settings](configuration/advanced-settings.md#planned-settings-not-yet-applied).

---

## Cursor-Specific Issues

Promptimize works in:

- **Classic Mode** (`cursor --classic`)
- **Editor Window**
- **VS Code / VSCodium**

For chat insertion in Cursor, focus the Composer input before stopping recording.

---

## Getting More Help

- [Configuration Guide](configuration/README.md)
- [Configuration Webview Guide](configuration/webview-guide.md)
- [GitHub Issues](https://github.com/vypdev/cursor-whisper/issues)

Enable the **Promptimize** output channel for operational logs (timestamps, durations, error types). Transcriptions and optimized prompts are **never** written to logs.
