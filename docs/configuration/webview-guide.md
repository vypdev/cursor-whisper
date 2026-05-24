# Configuration Webview Guide

The **Promptimize Configuration** panel is the primary way to set up and manage the extension. It opens automatically on first launch and is available anytime via **Promptimize: Open Configuration** or the status bar gear icon.

---

## Opening the Panel

| Method | Action |
|--------|--------|
| First launch | Welcome notification → **Open Configuration** |
| Status bar | Click $(gear) **Settings** (or $(warning) **Setup** if incomplete) |
| Command Palette | `Promptimize: Open Configuration` or `Promptimize: Setup Wizard` |

Both **Setup Wizard** and **Open Configuration** open the same webview panel.

---

## Panel Sections

### 1. Transcription (Required)

Configure OpenAI Whisper for voice-to-text.

| Control | Purpose |
|---------|---------|
| **OpenAI API Key** | Password field for your Whisper API key (`sk-...`) |
| **Test** | Verifies the key against the OpenAI API |
| **Badge** | Shows configured / not configured status |

Keys are stored in VSCode SecretStorage (Keychain / Credential Manager). Saved keys appear masked (e.g. `sk-abc...xyz9`).

---

### 2. Prompt Optimization (Optional)

Convert transcribed speech into structured prompts using your chosen provider.

| Control | Purpose |
|---------|---------|
| **Enable prompt optimization** | Toggle optimization on/off |
| **Optimization provider** | Dropdown: OpenAI, Anthropic, Google, Azure, Ollama, OpenCode, OpenRouter, Cursor |
| **Provider API Key** | Shown when the selected provider requires credentials |
| **Azure / Ollama / OpenCode fields** | Provider-specific endpoint and deployment settings |
| **Model** | Model dropdown with **Refresh models** for dynamic lists |
| **Test optimization** | Runs a sample transformation against your provider |

**Dynamic model loading:** OpenAI, Ollama, OpenCode, and OpenRouter fetch live model lists. Anthropic, Google, and Cursor use curated static lists.

---

### 3. Transformation System Prompt

Customize how the AI rewrites your transcriptions.

| Control | Purpose |
|---------|---------|
| **System Prompt** | Multiline editor for the transformation instructions |
| **Reset to default** | Restores the built-in prompt engineer template |
| **Save prompt** | Persists to `promptimize.transformationSystemPrompt` |

Changes apply to all optimization providers.

---

### 4. Provider Comparison

Expandable table comparing all eight providers by cost, speed, privacy, and best use case. Helps choose a provider without leaving the panel.

---

### Footer Actions

| Button | Purpose |
|--------|---------|
| **Save & Close** | Validates Whisper key (+ provider if optimization enabled), marks setup complete, closes panel |
| **Open documentation** | Opens the GitHub docs in your browser |

---

## Configuration UI vs Command Palette

| Task | Webview | Command Palette |
|------|---------|-----------------|
| Set OpenAI key | ✅ Password field + test | `Configure OpenAI API Key (Whisper)` |
| Choose provider | ✅ Dropdown + comparison table | `Configure Prompt Optimization Provider` (step wizard) |
| Pick OpenAI model | ✅ Dynamic dropdown | `Configure OpenAI Optimization Model` |
| Edit system prompt | ✅ Full editor + reset | VS Code Settings only |
| Test Whisper | ✅ Inline test button | Part of `Test Configuration` |
| Test optimization | ✅ Inline test button | `Test Configuration` (opens results webview) |
| Transcription language | ❌ Use VS Code Settings | Settings → `promptimize.transcriptionLanguage` |
| Transcription hint | ❌ Use VS Code Settings | Settings → `promptimize.transcriptionHint` |
| Advanced settings (planned) | ❌ Use VS Code Settings | See [Advanced Settings](advanced-settings.md) |

---

## Inline Feedback

The webview provides real-time validation without reloading:

- **Badges** — Whisper and optimization configuration status
- **Status text** — Contextual hints below each section
- **Notifications** — Success/error banners at the top after save or test
- **Test results** — Whisper and optimization test pass/fail inline

---

## Complete Setup Flow

1. Enter OpenAI API key → click **Test** (optional)
2. Enable optimization if desired → select provider → enter credentials
3. Choose model → click **Test optimization** (optional)
4. Customize system prompt if needed (optional)
5. Click **Save & Close**

If Whisper is missing or optimization is enabled but the provider is incomplete, **Save & Close** shows an error and keeps the panel open.

---

## Test Configuration Command (Full Results)

For a detailed before/after comparison, run **Promptimize: Test Configuration** from the Command Palette. This opens a separate webview panel showing:

- Whisper connection status
- Optimization provider status
- Original sample transcription
- Transformed prompt
- **Improvements** list (heuristic analysis)

See [Advanced Settings — Test Configuration](advanced-settings.md#test-configuration-output) for details on the improvements list.

---

**See also:** [Configuration Guide](README.md) · [Provider Selection](provider-selection.md) · [Advanced Settings](advanced-settings.md)
