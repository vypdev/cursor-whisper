# Technical Research

**Last Updated**: 2026-05-23

---

## OpenAI Whisper API

### Overview

**What**: Speech-to-text transcription service  
**Model**: `whisper-1`  
**Endpoint**: `https://api.openai.com/v1/audio/transcriptions`  
**Documentation**: [OpenAI Whisper API Docs](https://platform.openai.com/docs/guides/speech-to-text)

### API Specification

**Request**:
```http
POST /v1/audio/transcriptions
Content-Type: multipart/form-data

file: <audio_file>
model: whisper-1
language: en (optional)
prompt: <hint_text> (optional)
response_format: json (default) | text | srt | verbose_json | vtt
temperature: 0.0-1.0 (default: 0)
```

**Response** (JSON):
```json
{
  "text": "Transcribed text here"
}
```

**Response** (verbose_json):
```json
{
  "task": "transcribe",
  "language": "english",
  "duration": 5.23,
  "text": "Transcribed text here",
  "segments": [
    {
      "id": 0,
      "seek": 0,
      "start": 0.0,
      "end": 2.5,
      "text": " Transcribed text",
      "tokens": [50364, 2783, ...],
      "temperature": 0.0,
      "avg_logprob": -0.3,
      "compression_ratio": 1.5,
      "no_speech_prob": 0.01
    }
  ]
}
```

### Limitations

- **File Size**: 25MB maximum
- **Formats**: `flac`, `m4a`, `mp3`, `mp4`, `mpeg`, `mpga`, `oga`, `ogg`, `wav`, `webm`
- **Duration**: No official limit, but longer files may timeout
- **Rate Limits**: Tier-dependent (see OpenAI dashboard)
- **Cost**: $0.006 per minute (as of 2024)

### Best Practices

1. **Audio Quality**:
   - 16kHz sample rate (optimal for speech)
   - Mono channel (stereo not needed)
   - 16-bit depth
   - WAV format (lossless)

2. **Optimization**:
   - Use `prompt` parameter for technical terminology
   - Use `language` hint if known (faster, more accurate)
   - Keep temperature at 0 for deterministic results
   - Enable audio enhancements (echo cancellation, noise suppression)

3. **Error Handling**:
   - Retry on 429 (rate limit) with exponential backoff
   - Retry on 503 (service unavailable)
   - Don't retry on 400 (bad request) or 401 (auth error)

### Implementation Example

```typescript
import { OpenAI } from 'openai';
import { AudioData } from '../domain/value-objects/AudioData';

export class OpenAIWhisperService {
  private client: OpenAI;

  async transcribe(audio: AudioData): Promise<string> {
    const file = new File([audio.buffer], 'recording.wav', {
      type: 'audio/wav'
    });

    const response = await this.client.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language: 'en', // Optional hint
      prompt: 'Technical programming terminology', // Optional hint
      temperature: 0, // Deterministic
      response_format: 'json'
    });

    return response.text;
  }
}
```

---

## OpenAI GPT-4 API

### Overview

**What**: Text generation and transformation  
**Model**: `gpt-4o` (faster, cheaper than gpt-4)  
**Endpoint**: `https://api.openai.com/v1/chat/completions`  
**Documentation**: [OpenAI Chat API Docs](https://platform.openai.com/docs/guides/text-generation)

### API Specification

**Request**:
```http
POST /v1/chat/completions
Content-Type: application/json

{
  "model": "gpt-4o",
  "messages": [
    {
      "role": "system",
      "content": "You are a helpful assistant."
    },
    {
      "role": "user",
      "content": "Hello!"
    }
  ],
  "temperature": 0.7,
  "max_tokens": 2000
}
```

**Response**:
```json
{
  "id": "chatcmpl-abc123",
  "object": "chat.completion",
  "created": 1677652288,
  "model": "gpt-4o",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! How can I help you?"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 20,
    "total_tokens": 30
  }
}
```

### Prompt Transformation Strategy

**System Prompt**:
```typescript
const SYSTEM_PROMPT = `You are an expert at transforming natural speech into structured, optimized prompts for AI coding assistants.

Given a voice transcription, transform it into a clear, structured prompt following these rules:

1. Remove filler words ("um", "uh", "like", etc.)
2. Fix grammar and sentence structure
3. Preserve technical terms exactly
4. Structure into sections:
   - Context (what's the situation)
   - Objective (what needs to be done)
   - Requirements (specific needs)
   - Constraints (limitations or preferences)

5. Make it concise but complete
6. Use technical language appropriate for developers
7. Remove redundancy

Output ONLY the transformed prompt, no explanations.`;
```

**Example Transformation**:

**Input** (transcription):
```
Um, so I need to, like, create a function that, you know, sorts an array 
but I want it to be, uh, really fast and also it should handle, like, 
edge cases like empty arrays and stuff. Oh and make sure it's TypeScript.
```

**Output** (transformed):
```
Create a TypeScript function to sort an array with the following requirements:

Context:
- Need an array sorting implementation

Objective:
- Implement a high-performance sorting function

Requirements:
- TypeScript type safety
- Handle edge cases (empty arrays, null values)
- Optimize for performance

Constraints:
- Must be production-ready
```

### Cost Estimation

**GPT-4o Pricing** (as of 2024):
- Input: $15.00 per 1M tokens
- Output: $60.00 per 1M tokens

**Average transformation**:
- Input: ~200 tokens (transcription + system prompt)
- Output: ~150 tokens (structured prompt)
- Cost per transformation: ~$0.012 (about 1.2 cents)

**Monthly cost** (100 transformations/day):
- 100 * 30 = 3,000 transformations
- 3,000 * $0.012 = $36/month

---

## VSCode Extension API

### Overview

**Documentation**: [VSCode Extension API](https://code.visualstudio.com/api)

### Key APIs Used

#### 1. Commands

```typescript
import * as vscode from 'vscode';

// Register command
const disposable = vscode.commands.registerCommand(
  'promptimize.startRecording',
  async () => {
    // Command logic
  }
);

context.subscriptions.push(disposable);
```

#### 2. Status Bar

```typescript
const statusBar = vscode.window.createStatusBarItem(
  vscode.StatusBarAlignment.Right,
  100
);

statusBar.text = '$(mic) Voice';
statusBar.command = 'promptimize.startRecording';
statusBar.show();
```

#### 3. SecretStorage

```typescript
// Store API key
await context.secrets.store('promptimize.openai.apiKey', apiKey);

// Retrieve API key
const apiKey = await context.secrets.get('promptimize.openai.apiKey');

// Delete API key
await context.secrets.delete('promptimize.openai.apiKey');
```

**Platform Storage**:
- macOS: Keychain
- Windows: Credential Manager
- Linux: Secret Service API

#### 4. Configuration

```typescript
// Get configuration
const config = vscode.workspace.getConfiguration('promptimize');
const language = config.get<string>('transcriptionLanguage', 'auto');

// Update configuration
await config.update(
  'enablePromptTransformation',
  true,
  vscode.ConfigurationTarget.Global
);

// Watch for changes
vscode.workspace.onDidChangeConfiguration(event => {
  if (event.affectsConfiguration('promptimize')) {
    // Configuration changed
  }
});
```

#### 5. TextEditor

```typescript
// Get active editor
const editor = vscode.window.activeTextEditor;

if (editor) {
  // Insert text at cursor
  await editor.edit(editBuilder => {
    editBuilder.insert(editor.selection.active, 'text to insert');
  });

  // Replace selection
  await editor.edit(editBuilder => {
    editBuilder.replace(editor.selection, 'replacement text');
  });

  // Get current language
  const language = editor.document.languageId; // 'typescript', 'python', etc.
}
```

#### 6. Webview

```typescript
// Create webview panel
const panel = vscode.window.createWebviewPanel(
  'promptimizeRecorder',
  'Promptimize',
  vscode.ViewColumn.One,
  {
    enableScripts: true,
    retainContextWhenHidden: true
  }
);

// Set HTML content
panel.webview.html = getWebviewContent();

// Handle messages from webview
panel.webview.onDidReceiveMessage(message => {
  switch (message.type) {
    case 'audioData':
      // Handle audio data
      break;
  }
});

// Send message to webview
panel.webview.postMessage({
  type: 'startRecording'
});
```

---

## Cursor Compatibility Research

### Cursor Modes

**1. Classic Mode** (VSCode UI):
- ✅ Full VSCode Extension API support
- ✅ TextEditor API works
- ✅ Commands work
- ✅ Status bar works
- ✅ Webviews work

**2. Editor Window** (hybrid):
- ✅ Most VSCode APIs work
- ✅ TextEditor API works
- ⚠️ Chat integration limited

**3. Agents Window / Glass** (new UI):
- ⚠️ Limited VSCode Extension API
- ❌ Chat input NOT accessible via extension API
- ❌ Custom Chat Participant API unclear
- ✅ Clipboard fallback works

### Detection Strategy

```typescript
function detectCursorMode(): 'classic' | 'editor' | 'agents' {
  // Heuristic-based detection
  const workbenchConfig = vscode.workspace.getConfiguration('workbench');
  const appearance = workbenchConfig.get<string>('appearance');

  // Check for Cursor-specific settings
  if (appearance === 'cursor-agents') {
    return 'agents';
  }

  // Check if chat participant API available
  if (typeof vscode.chat !== 'undefined') {
    return 'editor';
  }

  return 'classic';
}
```

### Compatibility Matrix

| Feature | Classic | Editor | Agents |
|---------|---------|--------|--------|
| Audio Recording | ✅ | ✅ | ✅ |
| Transcription | ✅ | ✅ | ✅ |
| Transformation | ✅ | ✅ | ✅ |
| Editor Insertion | ✅ | ✅ | ✅ |
| Chat Insertion | ⚠️ Limited | ⚠️ Limited | ❌ |
| Clipboard Fallback | ✅ | ✅ | ✅ |

---

## Performance Research

### Audio Processing

**File Size Calculation**:
```
Sample Rate: 16,000 Hz
Bit Depth: 16 bits
Channels: 1 (mono)
Duration: 60 seconds

Size = (16000 * 16 * 1 * 60) / 8 / 1024 / 1024
     = 1.83 MB per minute
```

**Compression**:
- WAV: ~1.8MB/min (uncompressed)
- WebM: ~0.3MB/min (compressed)
- OGG: ~0.4MB/min (compressed)

**Recommendation**: Use WAV for maximum compatibility with Whisper API.

### API Latency

**Measured Latencies** (typical):
- Network upload: 1-3s (depends on connection)
- Whisper API processing: 3-8s
- GPT-4 API processing: 2-4s
- Total: 6-15s for 30s audio

---

## Security Research

### API Key Security

**Storage Options Evaluated**:

| Option | Security | Platform Support | Verdict |
|--------|----------|------------------|---------|
| Plain text config | ❌ Insecure | ✅ All | ❌ Rejected |
| Environment variables | ⚠️ Better | ✅ All | ⚠️ Fallback only |
| VSCode SecretStorage | ✅ Secure | ✅ All | ✅ **Selected** |
| Custom encryption | ⚠️ Complex | ✅ All | ❌ Overkill |

**Why SecretStorage**:
- Platform-native encryption
- No custom crypto needed
- VSCode handles key management
- Automatic migration support

---

## Summary

**Key Research Findings**:

1. ✅ **Whisper API**: Reliable, fast, accurate for English speech
2. ✅ **LLM providers**: Multiple cloud and local options for transformation
3. ✅ **VSCode API**: Mature, well-documented, stable
4. ⚠️ **Cursor Chat**: Limited extension API access
5. ✅ **Native audio capture**: Cross-platform via `@kstonekuan/audio-capture` ([ADR-0013](../adr/0013-native-audio-capture.md))
6. ✅ **Security**: SecretStorage is best option for API keys

**Technical Feasibility**: ✅ All core features are feasible

---

**Related:** [Cursor Compatibility ADR](../adr/0007-cursor-compatibility.md) · [Configuration Guide](../configuration/README.md)
