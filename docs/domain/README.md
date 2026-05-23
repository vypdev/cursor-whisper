# Domain Layer Documentation

**Last Updated**: 2026-05-23

---

## Overview

The Domain Layer contains the core business logic of Cursor Whisper. It is the heart of the application and has ZERO external dependencies.

**Location**: `src/domain/`

**Principles**:
- Pure business logic
- No framework dependencies
- No I/O operations
- Fully unit testable
- Framework-agnostic

---

## Structure

```
src/domain/
├── entities/           # Core business objects
│   ├── Recording.ts
│   ├── Transcription.ts
│   └── Prompt.ts
│
├── value-objects/      # Immutable values
│   ├── AudioData.ts
│   ├── AudioFormat.ts
│   ├── RecordingState.ts
│   └── ApiKey.ts
│
├── errors/             # Domain exceptions
│   ├── RecordingError.ts
│   ├── TranscriptionError.ts
│   ├── ValidationError.ts
│   └── ConfigError.ts
│
└── services/           # Domain services (optional)
    └── AudioValidator.ts
```

---

## Entities

### Recording Entity

**Purpose**: Represents a single audio recording session.

**File**: `src/domain/entities/Recording.ts`

```typescript
import { AudioData } from '../value-objects/AudioData';
import { RecordingState } from '../value-objects/RecordingState';
import { InvalidRecordingError } from '../errors/RecordingError';

export class Recording {
  private state: RecordingState;

  constructor(
    public readonly id: string,
    public readonly audioData: AudioData,
    public readonly timestamp: Date,
    public readonly duration: number
  ) {
    this.state = RecordingState.COMPLETED;
    this.validate();
  }

  private validate(): void {
    if (this.duration <= 0) {
      throw new InvalidRecordingError('Duration must be positive');
    }

    if (this.duration > 300) {
      throw new InvalidRecordingError('Duration exceeds maximum (5 minutes)');
    }

    if (this.audioData.buffer.length === 0) {
      throw new InvalidRecordingError('Audio data is empty');
    }

    const calculatedDuration = this.audioData.getDurationInSeconds();
    const durationDiff = Math.abs(calculatedDuration - this.duration);
    
    if (durationDiff > 1) {
      throw new InvalidRecordingError(
        `Duration mismatch: recorded ${this.duration}s, actual ${calculatedDuration}s`
      );
    }
  }

  isLongRecording(): boolean {
    return this.duration > 60;
  }

  isShortRecording(): boolean {
    return this.duration < 3;
  }

  getFileSizeInMB(): number {
    return this.audioData.getSizeInBytes() / (1024 * 1024);
  }

  exceedsSizeLimit(limitMB: number = 25): boolean {
    return this.getFileSizeInMB() > limitMB;
  }

  getState(): RecordingState {
    return this.state;
  }

  setState(newState: RecordingState): void {
    this.state = newState;
  }
}
```

**Business Rules**:
- Duration must be positive
- Duration cannot exceed 5 minutes (300s)
- Audio data cannot be empty
- Calculated duration must match recorded duration (within 1s tolerance)

### Transcription Entity

**Purpose**: Represents the result of transcribing audio to text.

**File**: `src/domain/entities/Transcription.ts`

```typescript
export class Transcription {
  constructor(
    public readonly id: string,
    public readonly recordingId: string,
    public readonly text: string,
    public readonly language: string,
    public readonly confidence: number | undefined,
    public readonly timestamp: Date
  ) {
    this.validate();
  }

  private validate(): void {
    if (!this.text || this.text.trim().length === 0) {
      throw new TranscriptionError('Transcription text cannot be empty');
    }

    if (this.text.length > 100000) {
      throw new TranscriptionError('Transcription text too long');
    }

    if (this.confidence !== undefined) {
      if (this.confidence < 0 || this.confidence > 1) {
        throw new TranscriptionError('Confidence must be between 0 and 1');
      }
    }
  }

  hasLowConfidence(): boolean {
    return this.confidence !== undefined && this.confidence < 0.7;
  }

  getWordCount(): number {
    return this.text.trim().split(/\s+/).length;
  }

  getCharacterCount(): number {
    return this.text.length;
  }

  isEmpty(): boolean {
    return this.text.trim().length === 0;
  }
}
```

### Prompt Entity

**Purpose**: Represents a transformed prompt ready for insertion.

**File**: `src/domain/entities/Prompt.ts`

```typescript
export class Prompt {
  constructor(
    public readonly id: string,
    public readonly transcriptionId: string,
    public readonly originalText: string,
    public readonly transformedText: string,
    public readonly improvements: string[],
    public readonly timestamp: Date
  ) {
    this.validate();
  }

  private validate(): void {
    if (!this.originalText || this.originalText.trim().length === 0) {
      throw new ValidationError('Original text cannot be empty');
    }

    if (!this.transformedText || this.transformedText.trim().length === 0) {
      throw new ValidationError('Transformed text cannot be empty');
    }
  }

  wasTransformed(): boolean {
    return this.originalText !== this.transformedText;
  }

  getCompressionRatio(): number {
    return this.transformedText.length / this.originalText.length;
  }

  hasImprovements(): boolean {
    return this.improvements.length > 0;
  }

  getSummary(): string {
    return `Prompt (${this.transformedText.length} chars, ${this.improvements.length} improvements)`;
  }
}
```

---

## Value Objects

### AudioData Value Object

**Purpose**: Immutable representation of audio binary data.

**File**: `src/domain/value-objects/AudioData.ts`

```typescript
import { AudioFormat } from './AudioFormat';

export class AudioData {
  constructor(
    public readonly buffer: Buffer,
    public readonly format: AudioFormat,
    public readonly sampleRate: number,
    public readonly channels: number
  ) {
    this.validate();
  }

  private validate(): void {
    if (buffer.length === 0) {
      throw new ValidationError('Audio buffer cannot be empty');
    }

    if (sampleRate <= 0) {
      throw new ValidationError('Sample rate must be positive');
    }

    if (channels < 1 || channels > 2) {
      throw new ValidationError('Channels must be 1 (mono) or 2 (stereo)');
    }
  }

  getSizeInBytes(): number {
    return this.buffer.length;
  }

  getSizeInKB(): number {
    return this.getSizeInBytes() / 1024;
  }

  getSizeInMB(): number {
    return this.getSizeInKB() / 1024;
  }

  getDurationInSeconds(bitDepth: number = 16): number {
    const bytesPerSample = bitDepth / 8;
    const samplesCount = this.buffer.length / (bytesPerSample * this.channels);
    return samplesCount / this.sampleRate;
  }

  isMono(): boolean {
    return this.channels === 1;
  }

  isStereo(): boolean {
    return this.channels === 2;
  }
}
```

### AudioFormat Enum

**File**: `src/domain/value-objects/AudioFormat.ts`

```typescript
export enum AudioFormat {
  WAV = 'wav',
  MP3 = 'mp3',
  WEBM = 'webm',
  OGG = 'ogg',
  M4A = 'm4a'
}

export function getAudioFormatFromMimeType(mimeType: string): AudioFormat {
  if (mimeType.includes('wav')) return AudioFormat.WAV;
  if (mimeType.includes('mp3') || mimeType.includes('mpeg')) return AudioFormat.MP3;
  if (mimeType.includes('webm')) return AudioFormat.WEBM;
  if (mimeType.includes('ogg')) return AudioFormat.OGG;
  if (mimeType.includes('m4a')) return AudioFormat.M4A;
  
  throw new ValidationError(`Unsupported MIME type: ${mimeType}`);
}

export function getMimeTypeFromFormat(format: AudioFormat): string {
  switch (format) {
    case AudioFormat.WAV:
      return 'audio/wav';
    case AudioFormat.MP3:
      return 'audio/mpeg';
    case AudioFormat.WEBM:
      return 'audio/webm';
    case AudioFormat.OGG:
      return 'audio/ogg';
    case AudioFormat.M4A:
      return 'audio/mp4';
  }
}
```

### RecordingState Enum

**File**: `src/domain/value-objects/RecordingState.ts`

```typescript
export enum RecordingState {
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

export function isActiveState(state: RecordingState): boolean {
  return state === RecordingState.RECORDING ||
         state === RecordingState.PROCESSING ||
         state === RecordingState.TRANSCRIBING ||
         state === RecordingState.TRANSFORMING ||
         state === RecordingState.INSERTING;
}

export function isTerminalState(state: RecordingState): boolean {
  return state === RecordingState.COMPLETED ||
         state === RecordingState.ERROR ||
         state === RecordingState.CANCELLED;
}
```

### ApiKey Value Object

**File**: `src/domain/value-objects/ApiKey.ts`

```typescript
export class ApiKey {
  private readonly value: string;

  constructor(key: string) {
    this.validate(key);
    this.value = key;
  }

  private validate(key: string): void {
    if (!key || key.trim().length === 0) {
      throw new ValidationError('API key cannot be empty');
    }

    if (!key.startsWith('sk-')) {
      throw new ValidationError('API key must start with sk-');
    }

    if (key.length < 20) {
      throw new ValidationError('API key seems too short');
    }
  }

  toString(): string {
    return this.value;
  }

  getMasked(): string {
    return `${this.value.substring(0, 7)}...${this.value.substring(this.value.length - 4)}`;
  }

  equals(other: ApiKey): boolean {
    return this.value === other.value;
  }
}
```

---

## Domain Errors

### RecordingError

**File**: `src/domain/errors/RecordingError.ts`

```typescript
export class RecordingError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'RecordingError';
    
    if (cause) {
      this.stack = `${this.stack}\nCaused by: ${cause.stack}`;
    }
  }
}

export class InvalidRecordingError extends RecordingError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidRecordingError';
  }
}

export class RecordingTimeoutError extends RecordingError {
  constructor(timeoutSeconds: number) {
    super(`Recording timeout after ${timeoutSeconds} seconds`);
    this.name = 'RecordingTimeoutError';
  }
}
```

### TranscriptionError

**File**: `src/domain/errors/TranscriptionError.ts`

```typescript
export class TranscriptionError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'TranscriptionError';
  }
}

export class TranscriptionTimeoutError extends TranscriptionError {
  constructor() {
    super('Transcription request timed out');
    this.name = 'TranscriptionTimeoutError';
  }
}

export class AudioTooLargeError extends TranscriptionError {
  constructor(sizeInMB: number) {
    super(`Audio file too large: ${sizeInMB.toFixed(2)}MB (max 25MB)`);
    this.name = 'AudioTooLargeError';
  }
}
```

### ValidationError

**File**: `src/domain/errors/ValidationError.ts`

```typescript
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field?: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}
```

### ConfigError

**File**: `src/domain/errors/ConfigError.ts`

```typescript
export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

export class MissingApiKeyError extends ConfigError {
  constructor() {
    super('OpenAI API Key not configured');
    this.name = 'MissingApiKeyError';
  }
}

export class InvalidConfigError extends ConfigError {
  constructor(field: string, reason: string) {
    super(`Invalid configuration for ${field}: ${reason}`);
    this.name = 'InvalidConfigError';
  }
}
```

---

## Domain Services

### AudioValidator Service

**Purpose**: Complex validation logic that doesn't belong to a single entity.

**File**: `src/domain/services/AudioValidator.ts`

```typescript
import { AudioData } from '../value-objects/AudioData';
import { ValidationError } from '../errors/ValidationError';

export class AudioValidator {
  private static readonly MAX_SIZE_BYTES = 25 * 1024 * 1024; // 25MB
  private static readonly MIN_DURATION_SECONDS = 0.1;
  private static readonly MAX_DURATION_SECONDS = 300; // 5 minutes
  private static readonly SUPPORTED_SAMPLE_RATES = [8000, 16000, 22050, 44100, 48000];

  static validate(audio: AudioData): void {
    this.validateSize(audio);
    this.validateDuration(audio);
    this.validateSampleRate(audio);
    this.validateChannels(audio);
  }

  private static validateSize(audio: AudioData): void {
    if (audio.getSizeInBytes() > this.MAX_SIZE_BYTES) {
      throw new ValidationError(
        `Audio file exceeds maximum size of 25MB (got ${audio.getSizeInMB().toFixed(2)}MB)`
      );
    }

    if (audio.getSizeInBytes() === 0) {
      throw new ValidationError('Audio file is empty');
    }
  }

  private static validateDuration(audio: AudioData): void {
    const duration = audio.getDurationInSeconds();

    if (duration < this.MIN_DURATION_SECONDS) {
      throw new ValidationError(
        `Audio duration too short: ${duration.toFixed(2)}s (minimum ${this.MIN_DURATION_SECONDS}s)`
      );
    }

    if (duration > this.MAX_DURATION_SECONDS) {
      throw new ValidationError(
        `Audio duration too long: ${duration.toFixed(2)}s (maximum ${this.MAX_DURATION_SECONDS}s)`
      );
    }
  }

  private static validateSampleRate(audio: AudioData): void {
    if (!this.SUPPORTED_SAMPLE_RATES.includes(audio.sampleRate)) {
      throw new ValidationError(
        `Unsupported sample rate: ${audio.sampleRate}Hz (supported: ${this.SUPPORTED_SAMPLE_RATES.join(', ')})`
      );
    }
  }

  private static validateChannels(audio: AudioData): void {
    if (audio.channels < 1 || audio.channels > 2) {
      throw new ValidationError(
        `Invalid channel count: ${audio.channels} (must be 1 or 2)`
      );
    }
  }

  static isValidForWhisper(audio: AudioData): boolean {
    try {
      this.validate(audio);
      return true;
    } catch (error) {
      return false;
    }
  }
}
```

---

## Testing Domain Logic

### Example Domain Tests

```typescript
// __tests__/domain/entities/Recording.test.ts
describe('Recording Entity', () => {
  describe('construction', () => {
    it('should create valid recording', () => {
      const audioData = createMockAudioData();
      const recording = new Recording(
        'rec-123',
        audioData,
        new Date(),
        5.2
      );

      expect(recording.id).toBe('rec-123');
      expect(recording.duration).toBe(5.2);
    });

    it('should throw error for negative duration', () => {
      expect(() => {
        new Recording('rec-123', audioData, new Date(), -5);
      }).toThrow(InvalidRecordingError);
    });

    it('should throw error for excessive duration', () => {
      expect(() => {
        new Recording('rec-123', audioData, new Date(), 400);
      }).toThrow(InvalidRecordingError);
    });

    it('should throw error for empty audio', () => {
      const emptyAudio = new AudioData(
        Buffer.alloc(0),
        AudioFormat.WAV,
        16000,
        1
      );

      expect(() => {
        new Recording('rec-123', emptyAudio, new Date(), 5);
      }).toThrow(InvalidRecordingError);
    });
  });

  describe('business logic', () => {
    it('should identify long recordings', () => {
      const recording = new Recording('id', audioData, new Date(), 90);
      expect(recording.isLongRecording()).toBe(true);
    });

    it('should identify short recordings', () => {
      const recording = new Recording('id', audioData, new Date(), 2);
      expect(recording.isShortRecording()).toBe(true);
    });

    it('should calculate file size correctly', () => {
      const audioData = createMockAudioData(1024 * 1024); // 1MB
      const recording = new Recording('id', audioData, new Date(), 5);
      
      expect(recording.getFileSizeInMB()).toBeCloseTo(1.0, 2);
    });

    it('should detect size limit exceeded', () => {
      const largeAudio = createMockAudioData(30 * 1024 * 1024); // 30MB
      const recording = new Recording('id', largeAudio, new Date(), 5);
      
      expect(recording.exceedsSizeLimit()).toBe(true);
    });
  });
});
```

---

## Key Principles

### 1. No External Dependencies

Domain entities should NEVER import from:
- `vscode`
- `react`
- `openai`
- Any infrastructure code
- Any framework

### 2. Immutability Where Possible

Value objects are immutable:
```typescript
// ✅ GOOD - Immutable
export class AudioData {
  constructor(
    public readonly buffer: Buffer,
    public readonly format: AudioFormat
  ) {}
}

// ❌ BAD - Mutable
export class AudioData {
  public buffer: Buffer;
  public format: AudioFormat;
  
  setBuffer(buffer: Buffer) {
    this.buffer = buffer;
  }
}
```

### 3. Business Rules in Domain

```typescript
// ✅ GOOD - Business rule in entity
export class Recording {
  isLongRecording(): boolean {
    return this.duration > 60; // Business rule
  }
}

// ❌ BAD - Business rule in use case
export class SomeUseCase {
  execute(recording: Recording) {
    if (recording.duration > 60) { // Business rule leaked!
      // ...
    }
  }
}
```

### 4. Rich Domain Model

```typescript
// ✅ GOOD - Rich with behavior
export class Transcription {
  getWordCount(): number {
    return this.text.trim().split(/\s+/).length;
  }

  hasLowConfidence(): boolean {
    return this.confidence !== undefined && this.confidence < 0.7;
  }
}

// ❌ BAD - Anemic domain model
export interface Transcription {
  text: string;
  confidence: number;
}
```

---

## Summary

The Domain Layer:
- ✅ Contains pure business logic
- ✅ Has zero external dependencies
- ✅ Is fully unit testable
- ✅ Defines core entities and value objects
- ✅ Encapsulates business rules
- ✅ Provides clear, type-safe interfaces
- ✅ Is the foundation of the application

---

**Next**: See [Application Layer](../application/ports.md) for use cases and ports.
