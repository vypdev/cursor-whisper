# Configuration Guide

Complete reference for installing, configuring, and using Cursor Whisper.

---

## Service Architecture

Cursor Whisper uses two independent AI services:

| Service | Provider | Required | Credentials |
|---------|----------|----------|-------------|
| **Transcription** | OpenAI Whisper | Yes | OpenAI API key |
| **Prompt optimization** | User choice | No | Provider-specific (see below) |

```mermaid
flowchart TB
    subgraph required [Required: Transcription]
        Mic[Microphone] --> Whisper[OpenAI Whisper API]
        Whisper --> Text[Raw transcription]
    end

    subgraph optional [Optional: Optimization]
        Text --> Enabled{enabled?}
        Enabled -->|No| Insert[Insert raw text]
        Enabled -->|Yes| Provider[Selected provider]
        Provider --> Optimized[Structured prompt]
        Optimized --> Insert
    end
```

---

## Step 1: OpenAI API Key (Whisper)

**Always required** for voice-to-text.

1. Create a key at https://platform.openai.com/api-keys
2. Run **Cursor Whisper: Configure OpenAI API Key (Whisper)** or use the setup wizard
3. Paste your key (stored securely in VSCode SecretStorage)

**Cost:** ~$0.006 per minute of audio

The same OpenAI key can be reused for OpenAI prompt optimization (Step 2, Option A).

---

## Step 2: Prompt Optimization (Optional)

Enable in settings: `cursorWhisper.enablePromptTransformation`

Or run **Cursor Whisper: Configure Prompt Optimization Provider**.

### Provider comparison

| Provider | Cost/Transform* | Speed | Privacy | Quality | Best For |
|----------|-----------------|-------|---------|---------|----------|
| OpenAI GPT-4o | ~$0.01 | Fast | Cloud | High | General use; reuse Whisper key |
| Anthropic Claude | ~$0.01–0.02 | Fast | Cloud | Very High | Complex reasoning |
| Google Gemini | ~$0.001 | Very Fast | Cloud | Good | Cost-sensitive usage |
| Azure OpenAI | Varies | Fast | Private Cloud | High | Enterprise deployments |
| Ollama | Free | Medium | Local | Good | Privacy-first, offline |

\*Plus Whisper transcription cost (~$0.006/min, always OpenAI)

### Option A: OpenAI (default)

```json
{
  "cursorWhisper.enablePromptTransformation": true,
  "cursorWhisper.transformationProvider": "openai",
  "cursorWhisper.transformationModel": "gpt-4o"
}
```

- Can reuse the same OpenAI key as Whisper
- See [OpenAI provider guide](../providers/openai.md)

### Option B: Anthropic

```json
{
  "cursorWhisper.transformationProvider": "anthropic",
  "cursorWhisper.anthropicModel": "claude-3-5-sonnet-20241022"
}
```

- Requires Anthropic API key (separate from OpenAI)
- See [Anthropic provider guide](../providers/anthropic.md)

### Option C: Google Gemini

```json
{
  "cursorWhisper.transformationProvider": "google",
  "cursorWhisper.googleModel": "gemini-1.5-pro"
}
```

- Requires Google AI API key
- See [Google provider guide](../providers/google-gemini.md)

### Option D: Azure OpenAI

```json
{
  "cursorWhisper.transformationProvider": "azure",
  "cursorWhisper.azureEndpoint": "https://my-resource.openai.azure.com",
  "cursorWhisper.azureDeployment": "gpt-4o-deployment"
}
```

- Requires Azure API key, endpoint, and deployment name
- See [Azure provider guide](../providers/azure-openai.md)

### Option E: Ollama (local)

```json
{
  "cursorWhisper.transformationProvider": "ollama",
  "cursorWhisper.ollamaBaseUrl": "http://localhost:11434",
  "cursorWhisper.ollamaModel": "llama3.1:8b"
}
```

- No API key; runs locally
- Whisper still requires OpenAI
- See [Ollama provider guide](../providers/ollama.md)

---

## Step 3: Verify Configuration

Run **Cursor Whisper: Test Configuration**

Expected result:

```
✓ Whisper: Working | ✓ Optimization (Provider): Working
```

---

## Advanced Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `transcriptionLanguage` | `auto` | Whisper language (ISO 639-1 or auto) |
| `audioQuality` | `high` | Recording quality |
| `maxRecordingDuration` | `120` | Max seconds per recording |
| `showNotifications` | `true` | Progress notifications |

---

## Credential Storage

- All API keys stored in VSCode **SecretStorage** (OS keychain)
- Keys stored per provider: `cursor-whisper.apiKey.{provider}`
- Switching providers does not delete saved keys

---

## Common Questions

### Do I need two OpenAI keys?

No. One OpenAI key powers Whisper transcription. The same key can power OpenAI optimization.

### Can I use Anthropic for optimization and OpenAI for transcription?

Yes. That is the intended design. Whisper always uses OpenAI; optimization uses your chosen provider.

### Can I disable optimization?

Yes. Set `enablePromptTransformation` to `false` or choose **transcription only** in the setup wizard.

---

**See also:** [Quick Start](../quickstart.md) · [Providers](../providers/README.md)
