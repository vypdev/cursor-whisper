# Advanced Settings

Settings available in VS Code Settings (`Cmd/Ctrl+,` → search **Promptimize**) that are not exposed in the configuration webview, plus details on planned settings and test output.

---

## Transcription

### `promptimize.transcriptionLanguage`

| | |
|---|---|
| **Default** | `auto` |
| **Values** | `auto`, `en`, `es`, `fr`, `de`, `it`, `pt`, `ja`, `ko`, `zh` |
| **Applied** | Yes — passed to OpenAI Whisper |
| **Webview** | Not available — configure in Settings |

When set to `auto`, Whisper auto-detects the spoken language.

```json
{
  "promptimize.transcriptionLanguage": "en"
}
```

---

### `promptimize.transcriptionHint`

| | |
|---|---|
| **Default** | (empty) |
| **Applied** | Yes — passed to Whisper as the `prompt` parameter |
| **Webview** | Not available — configure in Settings |

Optional hint text to improve Whisper accuracy for domain-specific vocabulary, acronyms, or technical terms. Whisper uses this as context, not as content to transcribe.

**Example:** Project uses unusual terms or stack-specific jargon:

```json
{
  "promptimize.transcriptionHint": "Kubernetes, Helm, ArgoCD, TypeScript, NestJS"
}
```

**Tips:**

- List proper nouns, product names, and acronyms you expect to say
- Keep hints concise (Whisper has a prompt length limit)
- Does not replace `transcriptionLanguage` — use both when needed

---

## Transformation

### `promptimize.transformationSystemPrompt`

| | |
|---|---|
| **Default** | Built-in prompt engineer template |
| **Applied** | Yes — sent to all optimization providers |
| **Webview** | Editable in configuration panel |

Customize transformation style, structure, and rules. See [Configuration Webview Guide](webview-guide.md#3-transformation-system-prompt).

---

## Context-Aware Optimization

When using **Promptimize** mode, the extension passes editor context to the optimization provider:

| Context | Source | Purpose |
|---------|--------|---------|
| `editorLanguage` | Active editor's `document.languageId` | Tailor prompt terminology (e.g. `typescript`, `python`) |
| `projectType` | Derived from language | Additional framing for the transformer |

**Requirements:**

- An editor tab must be active when you stop recording
- If no editor is open, optimization still runs without language context

This is automatic — no setting required.

---

## Dynamic Model Loading

Some providers fetch model lists at configuration time:

| Provider | Model list source |
|----------|-------------------|
| OpenAI | Live API (`listGptModels`) |
| Ollama | `GET /api/tags` on configured base URL |
| OpenCode | `GET /v1/models` on proxy base URL |
| OpenRouter | OpenRouter models API |
| Anthropic | Static curated list |
| Google | Static curated list |
| Azure | Deployment name from settings |
| Cursor | Static curated list |

Use **Refresh models** in the configuration webview or re-run provider configuration commands after adding new local models.

---

## Planned Settings (Not Yet Applied)

These settings appear in VS Code Settings and are loaded by the extension, but **do not change runtime behavior yet**:

| Setting | Default | Planned behavior |
|---------|---------|------------------|
| `promptimize.audioQuality` | `high` | Adjust recording sample rate / encoding |
| `promptimize.maxRecordingDuration` | `120` | Auto-stop recording after N seconds |
| `promptimize.showNotifications` | `true` | Suppress progress toasts when `false` |

**Current behavior:**

- Audio is always captured at **16 kHz mono** (optimal for Whisper)
- Recording stops only when you click stop or cancel
- Progress notifications always appear during stop/processing

Configure these in Settings for forward compatibility; they will take effect in a future release.

---

## Test Configuration Output

**Promptimize: Test Configuration** validates Whisper and optimization, then opens a **Configuration Test Result** webview when optimization succeeds.

### Webview contents

| Section | Description |
|---------|-------------|
| **Status lines** | `✓ Whisper (OpenAI): Working` and `✓ Optimization (Provider): Working` |
| **Cost note** | Reminder that Whisper charges apply; optimization test uses sample text only |
| **Original** | Sample developer ramble sent to the transformer |
| **Transformed** | Optimized prompt from your configured provider |
| **Improvements** | Heuristic list of detected enhancements (see below) |

### Improvements heuristics

The improvements list is computed locally (not from the LLM). Possible entries:

| Improvement | Trigger |
|-------------|---------|
| **Removed filler words** | Original contained fillers (`um`, `uh`, `like`, etc.) and transformed text has fewer |
| **Made more concise** | Transformed text is at least 10% shorter |
| **Added clear structure** | Transformed text includes `Context:`, `Objective:`, or `Requirements:` sections |
| **Improved sentence structure** | Transformed text has more sentences than the original |

If optimization is disabled, the command tests Whisper only and shows an information toast.

---

**See also:** [Configuration Guide](README.md) · [Configuration Webview Guide](webview-guide.md)
