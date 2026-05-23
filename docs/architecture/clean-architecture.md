# Clean Architecture in Cursor Whisper

**Last Updated**: 2026-05-23

---

## Overview

Cursor Whisper implements Clean Architecture (also known as Hexagonal Architecture or Ports & Adapters). This document explains what that means and how it's applied in our codebase.

---

## What is Clean Architecture?

Clean Architecture is an architectural pattern created by Robert C. Martin (Uncle Bob) that emphasizes:

1. **Independence of Frameworks**: Business logic doesn't depend on libraries
2. **Testability**: Business rules testable without UI, database, web server
3. **Independence of UI**: UI can change without changing business rules
4. **Independence of Database**: Can swap databases without affecting business logic
5. **Independence of External Agencies**: Business rules don't know about the outside world

---

## The Dependency Rule

**Source code dependencies must point only inward, toward higher-level policies.**

```
                 ┌──────────────┐
                 │   Entities   │  ← Domain Layer (Inner)
                 └──────┬───────┘
                        │
                 ┌──────▼───────┐
                 │  Use Cases   │  ← Application Layer
                 └──────┬───────┘
                        │
        ┌───────────────┴───────────────┐
        │                               │
┌───────▼────────┐            ┌────────▼──────┐
│ Controllers    │            │   Gateways    │  ← Outer Layers
│ Presenters     │            │   Adapters    │
└────────────────┘            └───────────────┘
```

**Key Point**: Outer layers can depend on inner layers, but NEVER the reverse.

---

## Layers in Cursor Whisper

### 1. Domain Layer (Innermost)

**What it is**: The heart of the application - pure business logic.

**Contains**:
- Entities (core business objects)
- Value Objects (immutable values)
- Business Rules (domain logic)
- Domain Errors (business exceptions)

**What it DOESN'T contain**:
- No framework imports (VSCode, React, etc.)
- No infrastructure code
- No I/O operations
- No external service calls

**Example - Domain Entity**:

```typescript
// src/domain/entities/Recording.ts
import { AudioData } from '../value-objects/AudioData';
import { RecordingState } from '../value-objects/RecordingState';

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
  }

  isLongRecording(): boolean {
    return this.duration > 60;
  }

  getFileSizeInMB(): number {
    return this.audioData.buffer.length / (1024 * 1024);
  }
}
```

**Example - Value Object**:

```typescript
// src/domain/value-objects/AudioFormat.ts
export enum AudioFormat {
  WAV = 'wav',
  MP3 = 'mp3',
  WEBM = 'webm',
  OGG = 'ogg'
}

export class AudioData {
  constructor(
    public readonly buffer: Buffer,
    public readonly format: AudioFormat,
    public readonly sampleRate: number,
    public readonly channels: number
  ) {
    if (buffer.length === 0) {
      throw new Error('Audio buffer cannot be empty');
    }

    if (sampleRate <= 0) {
      throw new Error('Sample rate must be positive');
    }

    if (channels < 1 || channels > 2) {
      throw new Error('Channels must be 1 (mono) or 2 (stereo)');
    }
  }

  getSizeInBytes(): number {
    return this.buffer.length;
  }

  getDurationInSeconds(bitDepth: number = 16): number {
    const bytesPerSample = bitDepth / 8;
    const samplesCount = this.buffer.length / (bytesPerSample * this.channels);
    return samplesCount / this.sampleRate;
  }
}
```

### 2. Application Layer

**What it is**: Application-specific business rules and orchestration.

**Contains**:
- Use Cases (application operations)
- Ports/Interfaces (contracts for dependencies)
- DTOs (data transfer objects)
- Application-specific errors

**What it DOESN'T contain**:
- No framework-specific code
- No direct external service usage
- No UI code
- No infrastructure implementations

**Example - Port (Interface)**:

```typescript
// src/application/ports/IAudioRecorder.ts
import { AudioData } from '../../domain/value-objects/AudioData';
import { RecordingState } from '../../domain/value-objects/RecordingState';

export interface IAudioRecorder {
  /**
   * Start recording audio from microphone
   * @throws PermissionError if microphone access denied
   * @throws RecordingError if recording fails to start
   */
  startRecording(): Promise<void>;

  /**
   * Stop recording and return audio data
   * @returns AudioData object with recorded audio
   * @throws RecordingError if no active recording
   */
  stopRecording(): Promise<AudioData>;

  /**
   * Cancel current recording without returning data
   */
  cancelRecording(): void;

  /**
   * Check if currently recording
   */
  isRecording(): boolean;

  /**
   * Get current recording state
   */
  getState(): RecordingState;

  /**
   * Register callback for state changes
   */
  onStateChange(callback: (state: RecordingState) => void): void;
}
```

**Example - Use Case**:

```typescript
// src/application/use-cases/StartRecordingUseCase.ts
import { IAudioRecorder } from '../ports/IAudioRecorder';
import { IConfigRepository } from '../ports/IConfigRepository';
import { ILogger } from '../ports/ILogger';
import { PermissionError } from '../../domain/errors/PermissionError';
import { ConfigError } from '../../domain/errors/ConfigError';

export class StartRecordingUseCase {
  constructor(
    private readonly audioRecorder: IAudioRecorder,
    private readonly configRepo: IConfigRepository,
    private readonly logger: ILogger
  ) {}

  async execute(): Promise<void> {
    this.logger.info('Starting recording use case');

    // 1. Validate configuration
    const config = await this.configRepo.getConfig();
    if (!config.apiKey) {
      throw new ConfigError('OpenAI API Key not configured');
    }

    // 2. Check if already recording
    if (this.audioRecorder.isRecording()) {
      throw new RecordingError('Already recording');
    }

    // 3. Check microphone permission
    const hasPermission = await this.checkMicrophonePermission();
    if (!hasPermission) {
      throw new PermissionError('Microphone permission denied');
    }

    // 4. Start recording
    try {
      await this.audioRecorder.startRecording();
      this.logger.info('Recording started successfully');
    } catch (error) {
      this.logger.error('Failed to start recording', error);
      throw new RecordingError('Failed to start recording', error);
    }
  }

  private async checkMicrophonePermission(): Promise<boolean> {
    // Implementation depends on platform
    // This is abstracted away from the use case
    return true;
  }
}
```

### 3. Infrastructure Layer

**What it is**: Implementations of application ports, external service integrations.

**Contains**:
- Adapters (implement ports)
- External service clients (OpenAI, VSCode APIs)
- Repositories (config, storage)
- File management
- Network communication

**What it DOESN'T contain**:
- No business logic (that's in Domain)
- No use case orchestration (that's in Application)
- No UI code (that's in Presentation)

**Example - Adapter**:

```typescript
// src/infrastructure/audio/WebviewAudioRecorder.ts
import { IAudioRecorder } from '../../application/ports/IAudioRecorder';
import { AudioData } from '../../domain/value-objects/AudioData';
import { AudioFormat } from '../../domain/value-objects/AudioFormat';
import { RecordingState } from '../../domain/value-objects/RecordingState';
import { MicrophonePermissionManager } from './MicrophonePermissionManager';
import { ILogger } from '../../application/ports/ILogger';

export class WebviewAudioRecorder implements IAudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private state: RecordingState = RecordingState.IDLE;
  private stateListeners: Array<(state: RecordingState) => void> = [];
  private startTime: number = 0;

  constructor(
    private readonly permissionManager: MicrophonePermissionManager,
    private readonly logger: ILogger
  ) {}

  async startRecording(): Promise<void> {
    // Check permission first
    const hasPermission = await this.permissionManager.requestPermission();
    if (!hasPermission) {
      throw new PermissionError('Microphone permission denied');
    }

    // Get user media
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 16000,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });

    // Create MediaRecorder
    const mimeType = this.getSupportedMimeType();
    this.mediaRecorder = new MediaRecorder(this.stream, {
      mimeType,
      audioBitsPerSecond: 128000
    });

    // Setup handlers
    this.setupMediaRecorderHandlers();

    // Start recording
    this.audioChunks = [];
    this.startTime = Date.now();
    this.mediaRecorder.start(100);
    this.setState(RecordingState.RECORDING);

    this.logger.info('Recording started');
  }

  async stopRecording(): Promise<AudioData> {
    if (!this.mediaRecorder || this.state !== RecordingState.RECORDING) {
      throw new RecordingError('No active recording to stop');
    }

    return new Promise((resolve, reject) => {
      this.mediaRecorder!.onstop = async () => {
        try {
          const duration = (Date.now() - this.startTime) / 1000;
          const audioBlob = new Blob(this.audioChunks, {
            type: this.mediaRecorder!.mimeType
          });

          // Convert to WAV
          const wavBlob = await this.convertToWav(audioBlob);
          const arrayBuffer = await wavBlob.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          this.cleanup();

          const audioData = new AudioData(
            buffer,
            AudioFormat.WAV,
            16000,
            1
          );

          this.logger.info('Recording stopped', {
            duration,
            size: buffer.length
          });

          resolve(audioData);
        } catch (error) {
          reject(error);
        }
      };

      this.mediaRecorder!.stop();
      this.setState(RecordingState.IDLE);
    });
  }

  // ... other methods
}
```

### 4. Presentation Layer

**What it is**: User interface and framework-specific code.

**Contains**:
- Commands (VSCode command handlers)
- UI Components (React for webview)
- Status Bar items
- State management for UI
- VSCode-specific integrations

**What it DOESN'T contain**:
- No business logic (call use cases instead)
- No direct external service calls (use infrastructure through application)
- No domain entities (use DTOs)

**Example - Command**:

```typescript
// src/presentation/commands/StartRecordingCommand.ts
import * as vscode from 'vscode';
import { StartRecordingUseCase } from '../../application/use-cases/StartRecordingUseCase';
import { PermissionError } from '../../domain/errors/PermissionError';
import { ConfigError } from '../../domain/errors/ConfigError';
import { RecordingError } from '../../domain/errors/RecordingError';

export function registerStartRecordingCommand(
  context: vscode.ExtensionContext,
  useCase: StartRecordingUseCase
): vscode.Disposable {
  return vscode.commands.registerCommand(
    'cursor-whisper.startRecording',
    async () => {
      try {
        // Just call the use case - no business logic here
        await useCase.execute();
        
        vscode.window.showInformationMessage('Recording started');
      } catch (error) {
        // Handle different error types with appropriate UI response
        if (error instanceof ConfigError) {
          const selection = await vscode.window.showErrorMessage(
            'OpenAI API Key not configured',
            'Configure Now'
          );
          
          if (selection === 'Configure Now') {
            await vscode.commands.executeCommand('cursor-whisper.configureApiKey');
          }
        } else if (error instanceof PermissionError) {
          await vscode.window.showErrorMessage(
            'Microphone permission denied. Please check system settings.',
            'Open Settings'
          );
        } else if (error instanceof RecordingError) {
          await vscode.window.showErrorMessage(
            `Recording failed: ${error.message}`
          );
        } else {
          await vscode.window.showErrorMessage(
            `Unexpected error: ${error.message}`
          );
        }
      }
    }
  );
}
```

---

## Ports and Adapters

### What are Ports?

**Ports** are interfaces that define contracts. They live in the Application layer.

```typescript
// Application layer defines the port
export interface ITranscriptionService {
  transcribe(audio: AudioData, options?: TranscriptionOptions): Promise<TranscriptionResult>;
  validateAudioFile(audio: AudioData): boolean;
}
```

### What are Adapters?

**Adapters** are implementations of ports. They live in the Infrastructure layer.

```typescript
// Infrastructure layer provides the adapter
export class OpenAIWhisperService implements ITranscriptionService {
  async transcribe(audio: AudioData, options?: TranscriptionOptions): Promise<TranscriptionResult> {
    // Implementation using OpenAI SDK
  }

  validateAudioFile(audio: AudioData): boolean {
    // Validation logic
  }
}
```

### Why This Pattern?

1. **Application doesn't care about implementation**: Use case uses `ITranscriptionService`, not `OpenAIWhisperService`
2. **Easy to swap**: Can replace OpenAI with Google, Azure, etc. without touching use cases
3. **Easy to test**: Mock the port, test the use case
4. **Clear contracts**: Interface documents what's expected

---

## Dependency Inversion

### The Problem (Without DI)

```typescript
// ❌ BAD: Use case depends on concrete implementation
export class TranscribeAudioUseCase {
  private whisperService = new OpenAIWhisperService(); // Tight coupling!

  async execute(audio: AudioData) {
    return await this.whisperService.transcribe(audio);
  }
}
```

**Problems**:
- Can't test without calling real OpenAI API
- Can't swap to different provider
- Changes to OpenAIWhisperService break use case

### The Solution (With DI)

```typescript
// ✅ GOOD: Use case depends on abstraction
export class TranscribeAudioUseCase {
  constructor(
    private transcriptionService: ITranscriptionService // Interface!
  ) {}

  async execute(audio: AudioData) {
    return await this.transcriptionService.transcribe(audio);
  }
}
```

**Benefits**:
- Test with mock implementation
- Swap providers easily
- Use case doesn't know about OpenAI

---

## Composition Root

All dependencies are wired together in ONE place: `extension.ts`

```typescript
// src/extension.ts - The Composition Root
export function activate(context: vscode.ExtensionContext) {
  // 1. Create infrastructure instances
  const logger = new ConsoleLogger();
  const secretStorage = new SecretStorage(context);
  const configRepo = new VSCodeConfigRepository(context);
  
  const whisperService = new OpenAIWhisperService(secretStorage, logger);
  const audioRecorder = new WebviewAudioRecorder(permissionManager, logger);
  
  // 2. Create use cases with dependencies injected
  const startRecordingUseCase = new StartRecordingUseCase(
    audioRecorder,
    configRepo,
    logger
  );
  
  const transcribeUseCase = new TranscribeAudioUseCase(
    whisperService,
    configRepo,
    logger
  );
  
  // 3. Create presentation layer with use cases
  const startRecordingCommand = registerStartRecordingCommand(
    context,
    startRecordingUseCase
  );
  
  context.subscriptions.push(startRecordingCommand);
}
```

---

## Testing Strategy

### Domain Layer Tests

```typescript
describe('Recording Entity', () => {
  it('should throw error for negative duration', () => {
    expect(() => {
      new Recording('id', audioData, new Date(), -5);
    }).toThrow(InvalidRecordingError);
  });

  it('should identify long recordings', () => {
    const recording = new Recording('id', audioData, new Date(), 90);
    expect(recording.isLongRecording()).toBe(true);
  });
});
```

### Application Layer Tests (with Mocks)

```typescript
describe('StartRecordingUseCase', () => {
  it('should start recording when config is valid', async () => {
    // Arrange: Create mocks
    const mockAudioRecorder: IAudioRecorder = {
      startRecording: jest.fn().mockResolvedValue(undefined),
      stopRecording: jest.fn(),
      cancelRecording: jest.fn(),
      isRecording: jest.fn().mockReturnValue(false),
      getState: jest.fn(),
      onStateChange: jest.fn()
    };
    
    const mockConfig: IConfigRepository = {
      getConfig: jest.fn().mockResolvedValue({ apiKey: 'test-key' })
    };
    
    const useCase = new StartRecordingUseCase(
      mockAudioRecorder,
      mockConfig,
      mockLogger
    );
    
    // Act
    await useCase.execute();
    
    // Assert
    expect(mockAudioRecorder.startRecording).toHaveBeenCalled();
  });
});
```

### Infrastructure Layer Tests (Integration)

```typescript
describe('OpenAIWhisperService', () => {
  it('should transcribe audio successfully', async () => {
    const service = new OpenAIWhisperService(secretStorage, logger);
    const audio = createTestAudioData();
    
    const result = await service.transcribe(audio);
    
    expect(result.text).toBeDefined();
    expect(result.text.length).toBeGreaterThan(0);
  });
});
```

---

## Benefits We Get

1. **Testability**: Each layer testable independently
2. **Flexibility**: Easy to swap implementations
3. **Maintainability**: Clear structure, easy to find code
4. **Scalability**: Can grow without tangling
5. **Team Collaboration**: Clear boundaries reduce conflicts
6. **Documentation**: Architecture IS documentation

---

## Common Pitfalls to Avoid

### ❌ Don't: Bypass Layers

```typescript
// BAD: Presentation calling Infrastructure directly
export class SomeCommand {
  async execute() {
    const whisper = new OpenAIWhisperService(); // NO!
    await whisper.transcribe(audio);
  }
}
```

### ✅ Do: Go Through Application

```typescript
// GOOD: Presentation calls Use Case
export class SomeCommand {
  constructor(private useCase: TranscribeAudioUseCase) {}
  
  async execute() {
    await this.useCase.execute(audio); // YES!
  }
}
```

### ❌ Don't: Put Business Logic in Infrastructure

```typescript
// BAD: Business logic in adapter
export class OpenAIWhisperService {
  async transcribe(audio: AudioData) {
    // Business logic here - NO!
    if (audio.duration > 300) {
      throw new Error('Too long');
    }
    // ...
  }
}
```

### ✅ Do: Keep Business Logic in Domain

```typescript
// GOOD: Business logic in entity
export class Recording {
  validate() {
    if (this.duration > 300) {
      throw new InvalidRecordingError('Duration exceeds maximum');
    }
  }
}
```

---

## References

- [Clean Architecture by Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Hexagonal Architecture](https://herbertograca.com/2017/11/16/explicit-architecture-01-ddd-hexagonal-onion-clean-cqrs-how-i-put-it-all-together/)
- [Dependency Inversion Principle](https://en.wikipedia.org/wiki/Dependency_inversion_principle)
- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)
- [ADR-0002: Adopt Clean Architecture](../adr/0002-clean-architecture.md)
