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

API keys are stored per provider (`cursor-whisper.apiKey.{provider}`). Switching providers does not delete saved keys.

---

### Option A: OpenAI (default)

```json
{
  "cursorWhisper.enablePromptTransformation": true,
  "cursorWhisper.transformationProvider": "openai",
  "cursorWhisper.transformationModel": "gpt-4o"
}
```

**Setup:** Get a key from [OpenAI Platform](https://platform.openai.com/api-keys). Run the setup wizard or **Configure Prompt Optimization Provider** and select OpenAI. The same key used for Whisper works for optimization.

**Recommended models:** `gpt-4o` (default), `gpt-4o-mini`, `gpt-4-turbo`

**Pitfalls:** Keys must start with `sk-`. Whisper and GPT share the same OpenAI account balance. Whisper key is required even if you use another provider for optimization.

---

### Option B: Anthropic

```json
{
  "cursorWhisper.transformationProvider": "anthropic",
  "cursorWhisper.anthropicModel": "claude-3-5-sonnet-20241022"
}
```

**Setup:** Configure OpenAI for Whisper first. Get an Anthropic key from [Anthropic Console](https://console.anthropic.com/). Run **Configure Prompt Optimization Provider**, select Anthropic, and enter your key.

**Recommended models:** `claude-3-5-sonnet-20241022` (default), `claude-3-5-haiku-20241022`, `claude-3-opus-20240229`

**Pitfalls:** Anthropic only handles optimization — Whisper still needs OpenAI. Use Anthropic keys from console.anthropic.com, not OpenAI keys.

---

### Option C: Google Gemini

```json
{
  "cursorWhisper.transformationProvider": "google",
  "cursorWhisper.googleModel": "gemini-1.5-pro"
}
```

**Setup:** Configure OpenAI for Whisper first. Get a key from [Google AI Studio](https://aistudio.google.com/app/apikey). Run **Configure Prompt Optimization Provider**, select Google Gemini, and enter your key.

**Recommended models:** `gemini-1.5-pro`, `gemini-1.5-flash`, `gemini-2.0-flash`

**Pitfalls:** Gemini only handles optimization. Use Google AI Studio keys, not GCP service account keys unless configured for the Generative Language API.

---

### Option D: Azure OpenAI

```json
{
  "cursorWhisper.transformationProvider": "azure",
  "cursorWhisper.azureEndpoint": "https://my-resource.openai.azure.com",
  "cursorWhisper.azureDeployment": "gpt-4o-deployment"
}
```

**Setup:** Configure OpenAI for Whisper first. Create an Azure OpenAI resource and deploy a chat model. Run **Configure Prompt Optimization Provider**, select Azure OpenAI, and enter your Azure API key, endpoint URL, and deployment name.

**Notes:** The **deployment name** (not the model name) is used for API calls. Endpoint should be the resource URL without a trailing slash. Azure API key is stored separately from your OpenAI Whisper key.

**Pitfalls:** Azure cannot be used for Whisper — transcription uses the public OpenAI API only. Use the deployment name from the Azure portal, not the model ID.

---

### Option E: Ollama (local)

```json
{
  "cursorWhisper.transformationProvider": "ollama",
  "cursorWhisper.ollamaBaseUrl": "http://localhost:11434",
  "cursorWhisper.ollamaModel": "llama3.1:8b"
}
```

**Setup:** Configure OpenAI for Whisper first. Install [Ollama](https://ollama.com/), pull a model (`ollama pull llama3.1:8b`), ensure Ollama is running, then select Ollama in **Configure Prompt Optimization Provider**. No API key required for Ollama.

**Recommended models:** `llama3.1:8b` (default), `mistral:latest`, `codellama:latest`

**Troubleshooting:** Confirm Ollama is reachable at the configured base URL. Run `ollama pull <model-name>` if the model is missing. Whisper still sends audio to OpenAI — only optimization runs locally.

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

## Common Questions

### Do I need two OpenAI keys?

No. One OpenAI key powers Whisper transcription. The same key can power OpenAI optimization.

### Can I use Anthropic for optimization and OpenAI for transcription?

Yes. That is the intended design. Whisper always uses OpenAI; optimization uses your chosen provider.

### Can I disable optimization?

Yes. Set `enablePromptTransformation` to `false` or choose **transcription only** in the setup wizard.

---

**See also:** [Quick Start](../quickstart.md)
