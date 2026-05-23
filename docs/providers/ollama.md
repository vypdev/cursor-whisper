# Ollama (Local)

Run prompt transformation locally with [Ollama](https://ollama.com/). No API key required.

## Configuration

```json
{
  "cursorWhisper.transformationProvider": "ollama",
  "cursorWhisper.ollamaBaseUrl": "http://localhost:11434",
  "cursorWhisper.ollamaModel": "llama3.1:8b"
}
```

## Setup

1. Install Ollama from [ollama.com](https://ollama.com/)
2. Pull a model: `ollama pull llama3.1:8b`
3. Ensure Ollama is running (`ollama serve` or the desktop app)
4. Run **Cursor Whisper: Configure Transformation Provider** and select **Ollama**

## Recommended Models

- `llama3.1:8b` — Good balance for local use (default)
- `mistral:latest` — Fast, capable
- `codellama:latest` — Code-focused prompts

## Troubleshooting

- **Server not reachable**: Confirm Ollama is running at the configured base URL
- **Model not found**: Run `ollama pull <model-name>`
- **Slow responses**: Use a smaller model or ensure GPU acceleration is available
