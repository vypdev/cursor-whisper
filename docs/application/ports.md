# Application Layer - Ports & Interfaces

**Last Updated**: 2026-05-23

---

## Overview

This document defines all **ports** (interfaces) in the Application Layer. These are contracts that infrastructure adapters must implement.

**Location**: `src/application/ports/`

---

## Audio Recording

### IAudioRecorder

**Purpose**: Contract for audio recording implementations.

**File**: `src/application/ports/IAudioRecorder.ts`

```typescript
import { AudioData } from '../../domain/value-objects/AudioData';
import { RecordingState } from '../../domain/value-objects/RecordingState';

/**
 * Port for audio recording functionality.
 * 
 * Implementations:
 * - NativeAudioRecorder (primary): Uses @kstonekuan/audio-capture in the extension host
 * - WebviewAudioRecorder (deprecated): Uses browser MediaRecorder — not wired in extension.ts
 */
export interface IAudioRecorder {
  /**
   * Start recording audio from microphone.
   * 
   * @throws PermissionError if microphone access denied
   * @throws RecordingError if recording fails to start
   */
  startRecording(): Promise<void>;

  /**
   * Stop recording and return audio data.
   * 
   * @returns AudioData object with recorded audio
   * @throws RecordingError if no active recording
   */
  stopRecording(): Promise<AudioData>;

  /**
   * Cancel current recording without returning data.
   * Cleans up resources immediately.
   */
  cancelRecording(): void;

  /**
   * Check if currently recording.
   * 
   * @returns true if recording is active
   */
  isRecording(): boolean;

  /**
   * Get current recording state.
   * 
   * @returns Current RecordingState
   */
  getState(): RecordingState;

  /**
   * Register callback for state changes.
   * 
   * @param callback Function called when state changes
   */
  onStateChange(callback: (state: RecordingState) => void): void;
}
```

---

## Transcription

### ITranscriptionService

**Purpose**: Contract for audio-to-text transcription.

**File**: `src/application/ports/ITranscriptionService.ts`

```typescript
import { AudioData } from '../../domain/value-objects/AudioData';
import { TranscriptionResult } from '../dto/TranscriptionResult';

export interface TranscriptionOptions {
  /**
   * Language of the audio (ISO 639-1 code).
   * If undefined, service will auto-detect.
   */
  language?: string;

  /**
   * Optional prompt to guide transcription.
   * Useful for technical terminology.
   */
  prompt?: string;

  /**
   * Temperature for sampling (0.0 - 1.0).
   * Lower = more deterministic.
   */
  temperature?: number;
}

/**
 * Port for audio transcription functionality.
 * 
 * Implementations:
 * - OpenAIWhisperService (primary): Uses OpenAI Whisper API
 * - GoogleSpeechService (future): Uses Google Cloud Speech-to-Text
 */
export interface ITranscriptionService {
  /**
   * Transcribe audio to text.
   * 
   * @param audio Audio data to transcribe
   * @param options Optional transcription options
   * @returns Transcription result with text
   * @throws TranscriptionError if transcription fails
   * @throws AudioTooLargeError if audio exceeds size limit
   */
  transcribe(
    audio: AudioData,
    options?: TranscriptionOptions
  ): Promise<TranscriptionResult>;

  /**
   * Validate audio file meets service requirements.
   * 
   * @param audio Audio data to validate
   * @returns true if valid, throws error otherwise
   * @throws ValidationError if audio is invalid
   */
  validateAudioFile(audio: AudioData): boolean;
}
```

---

## Prompt Transformation

### IPromptTransformer

**Purpose**: Contract for transforming transcription into optimized prompts.

**File**: `src/application/ports/IPromptTransformer.ts`

```typescript
import { TransformedPrompt } from '../dto/TransformedPrompt';

export interface PromptContext {
  /**
   * Programming language of active editor.
   */
  editorLanguage?: string;

  /**
   * Detected project type (Node.js, Python, etc.).
   */
  projectType?: string;

  /**
   * Previous prompts for context (future).
   */
  previousPrompts?: string[];
}

/**
 * Port for prompt transformation functionality.
 * 
 * Implementations:
 * - OpenAIPromptTransformer (primary): Uses GPT-4
 * - RuleBasedTransformer (future): Uses regex/NLP rules
 */
export interface IPromptTransformer {
  /**
   * Transform raw transcription into structured prompt.
   * 
   * @param transcription Raw transcription text
   * @param context Optional context for transformation
   * @returns Transformed prompt with improvements
   * @throws TransformationError if transformation fails
   */
  transform(
    transcription: string,
    context?: PromptContext
  ): Promise<TransformedPrompt>;
}
```

---

## Text Insertion

### ITextInserter

**Purpose**: Contract for inserting text into various targets.

**File**: `src/application/ports/ITextInserter.ts`

```typescript
/**
 * Port for text insertion functionality.
 * 
 * Implementations (in priority order):
 * - ChatParticipantInserter: Insert into Cursor chat
 * - EditorTextInserter: Insert into active editor
 * - FallbackTextInserter: Copy to clipboard + notify
 */
export interface ITextInserter {
  /**
   * Check if this inserter can handle current context.
   * 
   * @returns true if can insert in current context
   */
  canInsert(): boolean;

  /**
   * Insert text using this strategy.
   * 
   * @param text Text to insert
   * @returns true if successful
   * @throws InsertionError if insertion fails
   */
  insert(text: string): Promise<boolean>;

  /**
   * Get priority of this inserter.
   * Higher priority inserters are tried first.
   * 
   * @returns Priority number (1 = highest)
   */
  getPriority(): number;
}
```

---

## Configuration

### IConfigRepository

**Purpose**: Contract for configuration management.

**File**: `src/application/ports/IConfigRepository.ts`

```typescript
export interface Config {
  /**
   * OpenAI API key (stored separately in SecretStorage).
   */
  apiKey?: string;

  /**
   * Language for transcription (ISO 639-1 code or 'auto').
   */
  transcriptionLanguage: string;

  /**
   * Enable prompt transformation via GPT-4.
   */
  enablePromptTransformation: boolean;

  /**
   * Audio recording quality ('low' | 'medium' | 'high').
   */
  audioQuality: 'low' | 'medium' | 'high';

  /**
   * Maximum recording duration in seconds.
   */
  maxRecordingDuration: number;

  /**
   * Show status notifications.
   */
  showNotifications: boolean;

  /**
   * Transcription hint for technical terms (future).
   */
  transcriptionHint?: string;
}

/**
 * Port for configuration repository.
 * 
 * Implementations:
 * - VSCodeConfigRepository: Uses VSCode workspace configuration
 */
export interface IConfigRepository {
  /**
   * Get current configuration.
   * 
   * @returns Current config with defaults applied
   */
  getConfig(): Promise<Config>;

  /**
   * Update configuration.
   * 
   * @param config Partial config to update
   */
  updateConfig(config: Partial<Config>): Promise<void>;

  /**
   * Watch for configuration changes.
   * 
   * @param callback Function called when config changes
   */
  onConfigChange(callback: (config: Config) => void): void;
}
```

---

## Logging

### ILogger

**Purpose**: Contract for logging functionality.

**File**: `src/application/ports/ILogger.ts`

```typescript
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

/**
 * Port for logging functionality.
 * 
 * Implementations:
 * - ConsoleLogger: Logs to console
 * - VSCodeOutputChannelLogger: Logs to VSCode output channel
 * - FileLogger (future): Logs to file
 */
export interface ILogger {
  /**
   * Log debug message.
   */
  debug(message: string, data?: any): void;

  /**
   * Log info message.
   */
  info(message: string, data?: any): void;

  /**
   * Log warning message.
   */
  warn(message: string, data?: any): void;

  /**
   * Log error message.
   */
  error(message: string, error?: Error): void;

  /**
   * Set minimum log level.
   */
  setLevel(level: LogLevel): void;
}
```

---

## Data Transfer Objects (DTOs)

### TranscriptionResult

**File**: `src/application/dto/TranscriptionResult.ts`

```typescript
export interface TranscriptionResult {
  /**
   * Transcribed text.
   */
  text: string;

  /**
   * Detected or specified language.
   */
  language: string;

  /**
   * Audio duration in seconds.
   */
  duration: number;

  /**
   * Confidence score (0.0 - 1.0), if available.
   */
  confidence?: number;

  /**
   * Additional metadata from transcription service.
   */
  metadata?: Record<string, any>;
}
```

### TransformedPrompt

**File**: `src/application/dto/TransformedPrompt.ts`

```typescript
export interface TransformedPrompt {
  /**
   * Original transcribed text.
   */
  originalText: string;

  /**
   * Transformed/optimized text.
   */
  transformedText: string;

  /**
   * List of improvements made.
   */
  improvements: string[];

  /**
   * Optional sections extracted by transformer.
   */
  sections?: {
    context?: string;
    objectives?: string[];
    requirements?: string[];
    constraints?: string[];
  };
}
```

---

## Summary

All ports are:
- ✅ Well-documented with JSDoc
- ✅ Type-safe with TypeScript
- ✅ Framework-agnostic
- ✅ Easy to mock for testing
- ✅ Clear single responsibility
- ✅ Versioned for future changes

**Implementation**: See [`src/infrastructure/`](../../src/infrastructure/) for adapter implementations and [`api/README.md`](../api/README.md) for the API overview.
