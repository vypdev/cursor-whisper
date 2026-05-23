# Anthropic Claude

> **Important:** Voice-to-text transcription **always** uses OpenAI Whisper. You still need an OpenAI API key for transcription, plus a separate Anthropic API key for prompt optimization.

Use Anthropic Claude models for prompt optimization after Whisper transcribes your speech.

## How the services connect

```mermaid
graph LR
    Voice[Your Voice] --> Whisper[OpenAI Whisper]
    Whisper --> Text[Raw Text]
    Text --> Claude[Anthropic Claude<br/>Optimization]
    Claude --> Output[Optimized Prompt]
```

## Configuration

```json
{
  "cursorWhisper.transformationProvider": "anthropic",
  "cursorWhisper.anthropicModel": "claude-3-5-sonnet-20241022"
}
```

## Setup

1. Configure OpenAI API key for Whisper (required)
2. Get an Anthropic API key from [Anthropic Console](https://console.anthropic.com/)
3. Run **Cursor Whisper: Configure Prompt Optimization Provider**
4. Select **Anthropic** and enter your API key

## Cost estimate

| Service | Typical cost |
|---------|--------------|
| Whisper transcription (OpenAI) | ~$0.006/min |
| Claude 3.5 Sonnet optimization | ~$0.01–0.02/transform |

## Recommended Models

- `claude-3-5-sonnet-20241022` — Best quality (default)
- `claude-3-5-haiku-20241022` — Faster, lower cost
- `claude-3-opus-20240229` — Highest capability

## Common pitfalls

- **Missing OpenAI key** — Anthropic only handles optimization; Whisper still needs OpenAI
- **Wrong key in wizard** — Use Anthropic keys from console.anthropic.com, not OpenAI
