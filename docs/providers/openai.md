# OpenAI (Default)

OpenAI is the default transformation provider. Use the same API key as Whisper transcription.

## Configuration

```json
{
  "cursorWhisper.transformationProvider": "openai",
  "cursorWhisper.transformationModel": "gpt-4o"
}
```

## Setup

1. Get an API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Run **Cursor Whisper: Configure API Key**
3. Run **Cursor Whisper: Configure Model** to pick from models available on your key

## Recommended Models

- `gpt-4o` — Best balance of speed and quality (default)
- `gpt-4o-mini` — Lower cost
- `gpt-4-turbo` — Large context window
