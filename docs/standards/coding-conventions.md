# Coding Standards and Conventions

**Last Updated**: 2026-05-23

---

## Code Style

### TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./out",
    "rootDir": "./src",
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### ESLint Configuration

```javascript
// .eslintrc.js
module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier'
  ],
  rules: {
    '@typescript-eslint/explicit-function-return-type': 'error',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['error', {
      argsIgnorePattern: '^_'
    }],
    'no-console': 'warn',
    'prefer-const': 'error',
    'eqeqeq': ['error', 'always']
  }
};
```

### Prettier Configuration

```json
// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "avoid"
}
```

---

## Naming Conventions

### Files and Directories

**Pattern**: `PascalCase` for classes, `camelCase` for others

```
✅ GOOD:
src/domain/entities/Recording.ts
src/application/use-cases/StartRecordingUseCase.ts
src/infrastructure/audio/WebviewAudioRecorder.ts
src/shared/utils/generateId.ts

❌ BAD:
src/domain/entities/recording.ts
src/application/use-cases/start-recording-use-case.ts
src/infrastructure/audio/webview_audio_recorder.ts
```

### TypeScript Naming

| Type | Convention | Example |
|------|-----------|---------|
| **Interfaces** | PascalCase, prefix `I` | `IAudioRecorder`, `ILogger` |
| **Classes** | PascalCase | `Recording`, `OpenAIWhisperService` |
| **Types** | PascalCase | `RecordingState`, `AudioFormat` |
| **Enums** | PascalCase | `RecordingState`, `LogLevel` |
| **Functions** | camelCase | `startRecording`, `validateAudioFile` |
| **Variables** | camelCase | `audioData`, `transcriptionResult` |
| **Constants** | SCREAMING_SNAKE_CASE | `MAX_RECORDING_DURATION` |
| **Private fields** | camelCase, prefix `_` | `_mediaRecorder`, `_logger` |

### Examples

```typescript
// ✅ GOOD
export interface IAudioRecorder {
  startRecording(): Promise<void>;
}

export class WebviewAudioRecorder implements IAudioRecorder {
  private _mediaRecorder: MediaRecorder | null = null;
  private readonly MAX_DURATION_SECONDS = 300;

  public async startRecording(): Promise<void> {
    // ...
  }
}

export enum RecordingState {
  IDLE = 'idle',
  RECORDING = 'recording'
}

// ❌ BAD
export interface audioRecorder {
  StartRecording(): Promise<void>;
}

export class webview_audio_recorder implements audioRecorder {
  private MediaRecorder: MediaRecorder | null = null;
  private readonly maxDurationSeconds = 300;

  public async StartRecording(): Promise<void> {
    // ...
  }
}
```

---

## Code Organization

### File Structure

**Every file should have**:
1. Import statements (grouped and ordered)
2. Type definitions
3. Constants
4. Main implementation
5. Helper functions
6. Exports

**Example**:
```typescript
// 1. External imports
import * as vscode from 'vscode';
import { OpenAI } from 'openai';

// 2. Internal imports (grouped by layer)
import { IAudioRecorder } from '../../application/ports/IAudioRecorder';
import { AudioData } from '../../domain/value-objects/AudioData';
import { RecordingError } from '../../domain/errors/RecordingError';

// 3. Type definitions
interface MediaRecorderOptions {
  mimeType: string;
  audioBitsPerSecond: number;
}

// 4. Constants
const MAX_RECORDING_DURATION = 300;
const SUPPORTED_MIME_TYPES = ['audio/webm', 'audio/ogg'];

// 5. Main class
export class WebviewAudioRecorder implements IAudioRecorder {
  // Implementation
}

// 6. Helper functions
function getSupportedMimeType(): string {
  // Helper logic
}
```

### Import Grouping Order

```typescript
// 1. Node built-ins
import { Buffer } from 'buffer';
import * as path from 'path';

// 2. External packages
import * as vscode from 'vscode';
import { OpenAI } from 'openai';

// 3. Internal - Domain
import { Recording } from '../../domain/entities/Recording';

// 4. Internal - Application
import { IAudioRecorder } from '../../application/ports/IAudioRecorder';

// 5. Internal - Infrastructure
import { Logger } from '../logging/Logger';

// 6. Internal - Shared
import { generateId } from '../../shared/utils/generateId';

// 7. Types
import type { Config } from '../../application/dto/Config';
```

---

## Documentation

### JSDoc Comments

**Required for**:
- All public interfaces
- All public methods
- Complex algorithms
- Non-obvious behavior

**Template**:
```typescript
/**
 * Brief one-line description.
 * 
 * More detailed explanation if needed.
 * Can span multiple lines.
 * 
 * @param paramName - Parameter description
 * @returns Return value description
 * @throws ErrorType - When this error is thrown
 * 
 * @example
 * ```typescript
 * const recorder = new WebviewAudioRecorder();
 * await recorder.startRecording();
 * ```
 */
public async startRecording(): Promise<void> {
  // Implementation
}
```

**Examples**:

```typescript
/**
 * Port for audio recording functionality.
 * 
 * Implementations:
 * - WebviewAudioRecorder (primary): Uses browser MediaRecorder
 * - NodeAudioRecorder (fallback): Uses Node.js libraries
 */
export interface IAudioRecorder {
  /**
   * Start recording audio from microphone.
   * 
   * Requests microphone permission if not already granted.
   * Initializes MediaRecorder with optimal settings (16kHz mono).
   * 
   * @throws PermissionError if microphone access denied
   * @throws RecordingError if recording fails to start
   * 
   * @example
   * ```typescript
   * const recorder = new WebviewAudioRecorder();
   * await recorder.startRecording();
   * console.log('Recording started');
   * ```
   */
  startRecording(): Promise<void>;

  /**
   * Stop recording and return audio data.
   * 
   * Stops MediaRecorder, converts audio to WAV format (16kHz mono),
   * and returns AudioData object. Audio is immediately cleared from memory
   * after this method returns.
   * 
   * @returns AudioData object with recorded audio
   * @throws RecordingError if no active recording
   */
  stopRecording(): Promise<AudioData>;
}
```

---

## Error Handling

### Custom Errors

**Always extend base Error**:
```typescript
// ✅ GOOD
export class RecordingError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'RecordingError';
    
    // Preserve stack trace
    if (cause) {
      this.stack = `${this.stack}\nCaused by: ${cause.stack}`;
    }
  }
}

// ❌ BAD
export class RecordingError {
  constructor(public message: string) {}
}
```

### Error Handling Pattern

```typescript
// ✅ GOOD: Specific error types
try {
  await recorder.startRecording();
} catch (error) {
  if (error instanceof PermissionError) {
    // Handle permission denied
  } else if (error instanceof RecordingError) {
    // Handle recording error
  } else {
    // Handle unexpected error
    throw error;
  }
}

// ❌ BAD: Generic catch-all
try {
  await recorder.startRecording();
} catch (error) {
  console.error('Error:', error);
}
```

### Logging Errors

```typescript
// ✅ GOOD: Structured logging
this.logger.error('Failed to start recording', {
  error: error.message,
  stack: error.stack,
  context: { userId, timestamp }
});

// ❌ BAD: Console logging
console.error('Error:', error);
```

---

## Testing Conventions

### Test File Naming

```
✅ GOOD:
__tests__/domain/entities/Recording.test.ts
__tests__/application/use-cases/StartRecordingUseCase.test.ts

❌ BAD:
__tests__/Recording.spec.ts
tests/recording-test.ts
```

### Test Structure

```typescript
describe('ClassName or Feature', () => {
  // Setup
  let instance: ClassName;
  let mockDependency: jest.Mocked<IDependency>;

  beforeEach(() => {
    mockDependency = {
      method: jest.fn()
    };
    instance = new ClassName(mockDependency);
  });

  describe('methodName', () => {
    it('should do something when condition', () => {
      // Arrange
      const input = 'test';
      mockDependency.method.mockResolvedValue('result');

      // Act
      const result = instance.methodName(input);

      // Assert
      expect(result).toBe('expected');
      expect(mockDependency.method).toHaveBeenCalledWith(input);
    });

    it('should throw error when invalid input', () => {
      // Arrange
      const invalidInput = null;

      // Act & Assert
      expect(() => instance.methodName(invalidInput)).toThrow(ValidationError);
    });
  });
});
```

---

## TypeScript Best Practices

### Type Safety

```typescript
// ✅ GOOD: Explicit types
function processRecording(recording: Recording): TranscriptionResult {
  return {
    text: recording.audioData.toString(),
    duration: recording.duration
  };
}

// ❌ BAD: Implicit any
function processRecording(recording) {
  return {
    text: recording.audioData.toString(),
    duration: recording.duration
  };
}
```

### Avoid `any`

```typescript
// ✅ GOOD: Use generics or specific types
function parseResponse<T>(response: Response): T {
  return response.json() as T;
}

// ❌ BAD: Using any
function parseResponse(response: any): any {
  return response.json();
}
```

### Null Checks

```typescript
// ✅ GOOD: Optional chaining and nullish coalescing
const duration = recording?.audioData?.getDurationInSeconds() ?? 0;

// ❌ BAD: Manual null checks
const duration = recording && recording.audioData 
  ? recording.audioData.getDurationInSeconds() 
  : 0;
```

### Enums vs Union Types

```typescript
// ✅ GOOD: Use enums for closed sets
export enum RecordingState {
  IDLE = 'idle',
  RECORDING = 'recording',
  PROCESSING = 'processing'
}

// ✅ ALSO GOOD: Use union types for simple cases
export type AudioQuality = 'low' | 'medium' | 'high';

// ❌ BAD: String literals everywhere
function setState(state: 'idle' | 'recording' | 'processing') {
  // Repeated everywhere
}
```

---

## Git Conventions

### Commit Messages

**Format**: `<type>(<scope>): <subject>`

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style (formatting, semicolons)
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Build process, dependencies

**Examples**:
```
✅ GOOD:
feat(recording): add push-to-talk mode
fix(transcription): handle rate limit errors
docs(adr): add decision record for audio format
refactor(domain): extract AudioValidator service
test(use-cases): add StartRecordingUseCase tests

❌ BAD:
updated code
fixes
WIP
asdfasdf
```

### Branch Naming

**Format**: `<type>/<ticket-id>-<description>`

```
✅ GOOD:
feat/123-prompt-transformation
fix/456-audio-permission-error
docs/789-architecture-diagrams

❌ BAD:
my-feature
update
branch-1
```

---

## Performance Guidelines

### Async/Await

```typescript
// ✅ GOOD: Parallel execution
const [transcription, transformation] = await Promise.all([
  whisperService.transcribe(audio),
  gptService.transform(text)
]);

// ❌ BAD: Sequential execution (slower)
const transcription = await whisperService.transcribe(audio);
const transformation = await gptService.transform(text);
```

### Memory Management

```typescript
// ✅ GOOD: Clean up resources
public async stopRecording(): Promise<AudioData> {
  const audioData = await this.getAudioData();
  
  // Clean up
  this.audioChunks = [];
  this.stream?.getTracks().forEach(track => track.stop());
  this.stream = null;
  
  return audioData;
}

// ❌ BAD: Memory leaks
public async stopRecording(): Promise<AudioData> {
  return await this.getAudioData();
  // Stream and chunks still in memory
}
```

---

## Code Review Checklist

### Before Creating PR

- [ ] All tests pass
- [ ] No linter errors
- [ ] Code formatted with Prettier
- [ ] JSDoc comments added
- [ ] No console.log statements
- [ ] Error handling implemented
- [ ] Types explicit (no `any`)
- [ ] Tests added for new code
- [ ] Documentation updated

### During Code Review

**Look for**:
- [ ] Correct layer (domain/application/infrastructure/presentation)
- [ ] Dependencies point inward
- [ ] Business logic in domain
- [ ] Adapters implement ports
- [ ] Error handling complete
- [ ] Type safety maintained
- [ ] Tests cover edge cases
- [ ] No performance issues
- [ ] Security considerations

---

## Summary

**Core Principles**:
1. ✅ **Type Safety**: Explicit types, no `any`
2. ✅ **Clean Architecture**: Respect layer boundaries
3. ✅ **Documentation**: JSDoc for public APIs
4. ✅ **Testing**: Test behavior, not implementation
5. ✅ **Error Handling**: Specific error types
6. ✅ **Consistency**: Follow conventions
7. ✅ **Performance**: Async parallel execution
8. ✅ **Security**: No secrets in code

**Tools**:
- TypeScript 5.4+ (strict mode)
- ESLint (recommended + TypeScript rules)
- Prettier (opinionated formatting)
- Jest (testing)
- Husky (pre-commit hooks)

---

**Next**: See [Deployment Documentation](../deployment/release-process.md).
