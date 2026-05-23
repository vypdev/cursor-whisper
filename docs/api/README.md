# API Reference

**Last Updated**: 2026-05-23

---

## Overview

This section contains detailed API documentation for all modules in Cursor Whisper.

---

## Structure

```
docs/api/
├── README.md (this file)
├── domain/
│   ├── entities.md         # Recording, Transcription, Prompt
│   ├── value-objects.md    # AudioData, AudioFormat, RecordingState
│   └── errors.md           # All domain errors
│
├── application/
│   ├── use-cases.md        # All use cases
│   ├── ports.md            # All interface definitions
│   └── dto.md              # Data transfer objects
│
├── infrastructure/
│   ├── audio/
│   │   └── NativeAudioRecorder (see src/infrastructure/audio/)
│   ├── transcription/
│   │   └── OpenAIWhisperService.md
│   ├── transformation/
│   │   └── OpenAIPromptTransformer.md
│   ├── insertion/
│   │   ├── ChatParticipantInserter.md
│   │   ├── EditorTextInserter.md
│   │   └── FallbackTextInserter.md
│   └── configuration/
│       └── VSCodeConfigRepository.md
│
└── presentation/
    ├── commands.md         # All command handlers
    ├── status-bar.md       # Status bar item
    └── status-bar.md       # Status bar item
```

> **Note**: Layer implementation details live in [`src/`](../../src/). The tree above is the documentation target structure; not every file exists yet.

---

## Quick Reference

### Domain Layer

#### Entities

| Class | Purpose | Key Methods |
|-------|---------|-------------|
| `Recording` | Audio recording session (not yet wired in pipeline) | `isLongRecording()`, `getFileSizeInMB()` |
| `Transcription` | Transcription result | `hasLowConfidence()`, `getWordCount()` |
| `Prompt` | Transformed prompt | `wasTransformed()`, `getCompressionRatio()` |

#### Value Objects

| Class | Purpose | Key Methods |
|-------|---------|-------------|
| `AudioData` | Audio binary data | `getSizeInMB()`, `getDurationInSeconds()` |
| `AudioFormat` | Audio format enum | - |
| `RecordingState` | State enum | - |
| `ApiKey` | Secure API key | `getMasked()`, `equals()` |

#### Errors

| Error | Parent | When Thrown |
|-------|--------|-------------|
| `RecordingError` | `Error` | Recording failures |
| `TranscriptionError` | `Error` | Transcription failures |
| `ValidationError` | `Error` | Validation failures |
| `ConfigError` | `Error` | Configuration issues |
| `PermissionError` | `Error` | Permission denied |

---

### Application Layer

#### Use Cases

| Use Case | Purpose | Dependencies |
|----------|---------|--------------|
| `StartRecordingUseCase` | Start audio recording | `IAudioRecorder`, `IConfigRepository` |
| `StopRecordingUseCase` | Stop recording & process | `IAudioRecorder`, `ITranscriptionService` |
| `TranscribeAudioUseCase` | Transcribe audio to text | `ITranscriptionService` |
| `TransformPromptUseCase` | Transform text to prompt | `IPromptTransformer` |
| `InsertTextUseCase` | Insert text to target | `ITextInserter[]` |

#### Ports (Interfaces)

| Port | Purpose | Implementations |
|------|---------|----------------|
| `IAudioRecorder` | Audio recording | `NativeAudioRecorder` (primary), `WebviewAudioRecorder` (deprecated) |
| `ITranscriptionService` | Speech-to-text | `OpenAIWhisperService` |
| `IPromptTransformer` | Prompt optimization | `OpenAIPromptTransformer` |
| `ITextInserter` | Text insertion | `ChatParticipantInserter`, `EditorTextInserter`, `FallbackTextInserter` |
| `IConfigRepository` | Configuration | `VSCodeConfigRepository` |
| `ILogger` | Logging | `VSCodeOutputChannelLogger` (production), `ConsoleLogger` (unused) |

---

### Infrastructure Layer

#### Audio

| Class | Purpose | External Dependencies |
|-------|---------|---------------------|
| `NativeAudioRecorder` | Native PCM capture in extension host | `@kstonekuan/audio-capture` |
| `WebviewAudioRecorder` | Deprecated browser-based recording | MediaRecorder API (not wired) |

#### External Services

| Class | Purpose | External Dependencies |
|-------|---------|---------------------|
| `OpenAIWhisperService` | Whisper API integration | OpenAI SDK |
| `OpenAIPromptTransformer` | GPT-4 API integration | OpenAI SDK |

#### Text Insertion

| Class | Purpose | Priority |
|-------|---------|----------|
| `ChatParticipantInserter` | Insert into Cursor chat | 1 (highest) |
| `EditorTextInserter` | Insert into active editor | 2 |
| `FallbackTextInserter` | Copy to clipboard | 3 (lowest) |

---

### Presentation Layer

#### Commands

| Command ID | Handler | Purpose |
|-----------|---------|---------|
| `cursor-whisper.startRecording` | `StartRecordingCommand` | Start recording |
| `cursor-whisper.stopRecording` | `StopRecordingCommand` | Stop recording |
| `cursor-whisper.cancelRecording` | `CancelRecordingCommand` | Cancel recording |
| `cursor-whisper.configureApiKey` | `ConfigureApiKeyCommand` | Set API key |

#### UI Components

| Component | Purpose |
|-----------|---------|
| `RecordingStatusBarItem` | Status bar indicator |
| `RecordingWebview` | Optional recording panel |
| `MicrophoneButton` | Main recording button |

---

## Usage Examples

### Recording Workflow

```typescript
// 1. Start recording
const startUseCase = new StartRecordingUseCase(
  audioRecorder,
  configRepository,
  logger
);

await startUseCase.execute();

// 2. Stop recording and transcribe
const stopUseCase = new StopRecordingUseCase(
  audioRecorder,
  transcriptionService,
  logger
);

const transcription = await stopUseCase.execute();

// 3. Transform prompt
const transformUseCase = new TransformPromptUseCase(
  promptTransformer,
  logger
);

const prompt = await transformUseCase.execute(transcription.text);

// 4. Insert text
const insertUseCase = new InsertTextUseCase(
  [chatInserter, editorInserter, fallbackInserter],
  logger
);

await insertUseCase.execute(prompt.transformedText);
```

### Direct Adapter Usage

```typescript
// Audio recording
const recorder = new WebviewAudioRecorder(
  permissionManager,
  logger
);

await recorder.startRecording();
const audioData = await recorder.stopRecording();

// Transcription
const whisperService = new OpenAIWhisperService(
  secretStorage,
  logger
);

const result = await whisperService.transcribe(audioData, {
  language: 'en',
  prompt: 'Technical programming terminology'
});

console.log(result.text);
```

---

## Type Definitions

### Common Types

```typescript
// Configuration
interface Config {
  apiKey?: string;
  transcriptionLanguage: string;
  enablePromptTransformation: boolean;
  audioQuality: 'low' | 'medium' | 'high';
  maxRecordingDuration: number;
  showNotifications: boolean;
}

// Transcription Options
interface TranscriptionOptions {
  language?: string;
  prompt?: string;
  temperature?: number;
}

// Transcription Result
interface TranscriptionResult {
  text: string;
  language: string;
  duration: number;
  confidence?: number;
  metadata?: Record<string, any>;
}

// Transformed Prompt
interface TransformedPrompt {
  originalText: string;
  transformedText: string;
  improvements: string[];
  sections?: {
    context?: string;
    objectives?: string[];
    requirements?: string[];
    constraints?: string[];
  };
}

// Prompt Context
interface PromptContext {
  editorLanguage?: string;
  projectType?: string;
  previousPrompts?: string[];
}
```

---

## Error Handling

### Error Hierarchy

```
Error
├── RecordingError
│   ├── InvalidRecordingError
│   └── RecordingTimeoutError
├── TranscriptionError
│   ├── TranscriptionTimeoutError
│   └── AudioTooLargeError
├── ValidationError
├── ConfigError
│   ├── MissingApiKeyError
│   └── InvalidConfigError
└── PermissionError
```

### Error Response Pattern

```typescript
try {
  await useCase.execute();
} catch (error) {
  if (error instanceof ConfigError) {
    // Handle configuration error
    showConfigDialog();
  } else if (error instanceof PermissionError) {
    // Handle permission error
    showPermissionInstructions();
  } else if (error instanceof RecordingError) {
    // Handle recording error
    showRetryOption();
  } else {
    // Handle unexpected error
    logger.error('Unexpected error', error);
    throw error;
  }
}
```

---

## Events and State

### Recording State Machine

```typescript
enum RecordingState {
  IDLE = 'idle',
  RECORDING = 'recording',
  PROCESSING = 'processing',
  TRANSCRIBING = 'transcribing',
  TRANSFORMING = 'transforming',
  INSERTING = 'inserting',
  COMPLETED = 'completed',
  ERROR = 'error',
  CANCELLED = 'cancelled'
}
```

### State Change Events

```typescript
interface StateChangeEvent {
  previousState: RecordingState;
  currentState: RecordingState;
  timestamp: Date;
  error?: Error;
}

// Subscribe to state changes
audioRecorder.onStateChange((state: RecordingState) => {
  updateUI(state);
});
```

---

## Configuration Schema

### VSCode Settings

```json
{
  "cursorWhisper.transcriptionLanguage": {
    "type": "string",
    "default": "auto",
    "enum": ["auto", "en", "es", "fr", "de", "it", "pt", "ja", "ko", "zh"],
    "description": "Language for transcription"
  },
  "cursorWhisper.enablePromptTransformation": {
    "type": "boolean",
    "default": true,
    "description": "Enable AI-powered prompt transformation"
  },
  "cursorWhisper.audioQuality": {
    "type": "string",
    "enum": ["low", "medium", "high"],
    "default": "high",
    "description": "Audio recording quality"
  },
  "cursorWhisper.maxRecordingDuration": {
    "type": "number",
    "default": 120,
    "minimum": 10,
    "maximum": 300,
    "description": "Maximum recording duration in seconds"
  },
  "cursorWhisper.showNotifications": {
    "type": "boolean",
    "default": true,
    "description": "Show status notifications"
  }
}
```

---

## Extension Points

### Adding New Adapters

**Example: Add Google Speech-to-Text**

```typescript
// 1. Implement the port
export class GoogleSpeechService implements ITranscriptionService {
  async transcribe(
    audio: AudioData,
    options?: TranscriptionOptions
  ): Promise<TranscriptionResult> {
    // Google Speech API implementation
  }

  validateAudioFile(audio: AudioData): boolean {
    // Validation logic
  }
}

// 2. Register in composition root
const transcriptionService = config.provider === 'google'
  ? new GoogleSpeechService(credentials, logger)
  : new OpenAIWhisperService(secretStorage, logger);

// 3. Use in use cases (no changes needed!)
const useCase = new TranscribeAudioUseCase(
  transcriptionService,
  configRepository,
  logger
);
```

---

## Performance Considerations

### Async Operations

All I/O operations are async:
- `startRecording()`: ~500ms
- `stopRecording()`: ~1-2s (audio conversion)
- `transcribe()`: ~3-8s (API call)
- `transform()`: ~2-4s (API call)
- `insert()`: ~100ms

### Memory Management

- Audio data cleaned up immediately after transcription
- No persistent audio storage
- Webview disposed when not needed
- Event listeners unregistered on disposal

---

## Testing Guidelines

### Mocking Ports

```typescript
// Mock audio recorder
const mockRecorder: jest.Mocked<IAudioRecorder> = {
  startRecording: jest.fn().mockResolvedValue(undefined),
  stopRecording: jest.fn().mockResolvedValue(mockAudioData),
  cancelRecording: jest.fn(),
  isRecording: jest.fn().mockReturnValue(false),
  getState: jest.fn().mockReturnValue(RecordingState.IDLE),
  onStateChange: jest.fn()
};

// Use in tests
const useCase = new StartRecordingUseCase(
  mockRecorder,
  mockConfig,
  mockLogger
);

await useCase.execute();

expect(mockRecorder.startRecording).toHaveBeenCalled();
```

---

## Versioning

**Current API Version**: v0.1.0

**Compatibility**:
- Semantic versioning (MAJOR.MINOR.PATCH)
- Breaking changes increment MAJOR
- New features increment MINOR
- Bug fixes increment PATCH

---

## Support

For detailed documentation on specific modules, see:
- [Domain Layer](../domain/README.md)
- [Application Ports](../application/ports.md)
- [Source: Infrastructure](../../src/infrastructure/)
- [Source: Presentation](../../src/presentation/)

---

**Last Updated**: 2026-05-23  
**API Version**: 0.1.0  
**VSCode API**: 1.120+
