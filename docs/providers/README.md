# Transformation Providers

Cursor Whisper supports multiple AI providers for **prompt transformation** (optimizing transcribed speech into structured prompts). Transcription always uses OpenAI Whisper.

## Supported Providers

| Provider | API Key Required | Best For |
|----------|------------------|----------|
| [OpenAI](openai.md) | Yes (same as Whisper) | Default; GPT-4o quality |
| [Anthropic](anthropic.md) | Yes | Claude models; strong instruction following |
| [Google Gemini](google-gemini.md) | Yes | Cost-effective cloud option |
| [Azure OpenAI](azure-openai.md) | Yes | Enterprise Azure deployments |
| [Ollama](ollama.md) | No | Local/offline; privacy |

## Quick Setup

1. Open Command Palette (`Cmd/Ctrl+Shift+P`)
2. Run **Cursor Whisper: Configure Transformation Provider**
3. Select provider, enter API key (if required), and choose a model
4. Optionally run **Cursor Whisper: Test Transformation** to verify

## Settings

```json
{
  "cursorWhisper.transformationProvider": "openai",
  "cursorWhisper.enablePromptTransformation": true
}
```

See provider-specific pages for full configuration examples.

## Switching Providers

API keys are stored per provider. Switching providers does not delete previously saved keys.

## Cost Comparison (Approximate)

| Provider | Typical Cost per Transformation |
|----------|----------------------------------|
| OpenAI GPT-4o | ~$0.01 |
| Anthropic Claude 3.5 Sonnet | ~$0.01–0.02 |
| Google Gemini 1.5 Flash | ~$0.001 |
| Azure OpenAI | Varies by deployment |
| Ollama | Free (local compute) |

Whisper transcription remains ~$0.006/minute regardless of transformation provider.
