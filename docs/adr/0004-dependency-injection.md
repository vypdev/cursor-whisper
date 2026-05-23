# ADR-0004: Implement Dependency Injection Pattern

**Status**: Accepted

**Date**: 2026-05-23

**Deciders**: Core Team

**Related**: [ADR-0002](0002-clean-architecture.md)

---

## Context

With Clean Architecture adopted (ADR-0002), we need a strategy for managing dependencies between layers. Use cases need instances of ports (interfaces), but shouldn't create infrastructure implementations directly.

Requirements:
- **Testability**: Easy to inject mocks for testing
- **Flexibility**: Swap implementations without changing use case code
- **Clarity**: Clear dependency graph
- **Type safety**: Leverage TypeScript for compile-time safety
- **Simplicity**: Not overly complex for a VSCode extension

The extension has many dependencies:
- Use cases depend on ports (IAudioRecorder, ITranscriptionService, etc.)
- Commands depend on use cases
- Infrastructure implementations need configuration

---

## Decision

**We will use Constructor-Based Dependency Injection without a DI container/framework.**

Key aspects:
- Dependencies injected via constructor parameters
- Dependencies are interfaces (ports), not concrete classes
- Composition root in `extension.ts` wires everything together
- TypeScript types ensure compile-time safety
- No third-party DI framework (InversifyJS, TSyringe, etc.)
- Manual wiring for clarity and simplicity

### Example Pattern

```typescript
// Port (interface) in application layer
export interface IAudioRecorder {
  startRecording(): Promise<void>;
}

// Use case depends on port
export class StartRecordingUseCase {
  constructor(
    private audioRecorder: IAudioRecorder,  // Interface, not implementation
    private config: IConfigRepository
  ) {}
  
  async execute(): Promise<void> {
    await this.audioRecorder.startRecording();
  }
}

// Implementation in infrastructure layer
export class WebviewAudioRecorder implements IAudioRecorder {
  async startRecording(): Promise<void> { /* ... */ }
}

// Composition root wires everything
export function activate(context: vscode.ExtensionContext) {
  // Create infrastructure instances
  const audioRecorder = new WebviewAudioRecorder(logger);
  const config = new VSCodeConfigRepository(context);
  
  // Inject into use case
  const startRecordingUseCase = new StartRecordingUseCase(
    audioRecorder,
    config
  );
  
  // Register command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'cursor-whisper.startRecording',
      () => startRecordingUseCase.execute()
    )
  );
}
```

---

## Alternatives Considered

### Alternative 1: Service Locator Pattern
- **Description**: Central registry where objects look up their dependencies
- **Pros**:
  - Less constructor parameters
  - Easy to add new dependencies
  - Looks simpler at call sites
- **Cons**:
  - Hidden dependencies (not in constructor)
  - Runtime errors instead of compile-time
  - Harder to test (global state)
  - Considered an anti-pattern
  - No type safety
- **Why not chosen**: Loses compile-time safety, makes testing harder

### Alternative 2: DI Framework (InversifyJS)
- **Description**: Use a full-featured DI container like InversifyJS
- **Pros**:
  - Automatic dependency resolution
  - Lifetime management
  - Decorators for metadata
  - Convention over configuration
- **Cons**:
  - Additional dependency
  - Learning curve
  - Runtime overhead
  - Decorator metadata complexity
  - Overkill for extension size
  - Magic behavior (harder to debug)
- **Why not chosen**: Too heavy for our needs, adds complexity

### Alternative 3: Factory Pattern
- **Description**: Use factory functions to create and wire dependencies
- **Pros**:
  - Encapsulates creation logic
  - No DI framework needed
  - Flexible creation
- **Cons**:
  - Still need to pass dependencies
  - Factories become large
  - Not fundamentally different from manual wiring
  - Can hide dependencies
- **Why not chosen**: Doesn't add enough value over manual wiring

### Alternative 4: Singleton Pattern
- **Description**: Use singleton instances with static access
- **Pros**:
  - Easy global access
  - No constructor parameters needed
  - Simple to implement
- **Cons**:
  - Global state (hard to test)
  - Hidden dependencies
  - Tight coupling
  - No interface flexibility
  - Violates dependency inversion
- **Why not chosen**: Antithetical to Clean Architecture principles

---

## Consequences

### Positive Consequences
- **Explicit dependencies**: Clear in constructor what each class needs
- **Type safety**: TypeScript ensures dependencies are correct
- **Easy testing**: Inject mocks via constructor
- **Flexibility**: Swap implementations easily
- **No framework magic**: Everything is explicit TypeScript code
- **Compile-time errors**: Missing dependencies caught by compiler
- **Clear composition**: Single place (activate) shows all wiring
- **No runtime overhead**: No DI container resolution

### Negative Consequences
- **Constructor verbosity**: Many parameters for complex classes
- **Manual wiring**: Composition root can get large
- **Boilerplate**: Need to wire every dependency manually
- **Refactoring effort**: Adding dependency requires constructor changes
- **No auto-wiring**: Can't automatically resolve dependency trees

### Risks
- **Constructor explosion**: Too many parameters becomes unwieldy
  - **Mitigation**: Group related dependencies into services
  - **Mitigation**: Use builder pattern for complex objects
  - **Mitigation**: Limit use case dependencies to 3-5

- **Circular dependencies**: A depends on B depends on A
  - **Mitigation**: Architectural layers prevent this
  - **Mitigation**: Code reviews catch violations
  - **Mitigation**: Use events for cross-layer communication

- **Composition root complexity**: activate() becomes huge
  - **Mitigation**: Extract factory functions for subsystems
  - **Mitigation**: Document wiring with comments

### Technical Debt
- None significant. Simple DI is standard practice.
- Future: Could add lightweight DI container if needed (v2.0+)

---

## Implementation Notes

### Composition Root Pattern

```typescript
// extension.ts - The composition root
export function activate(context: vscode.ExtensionContext) {
  // Shared infrastructure
  const logger = new ConsoleLogger();
  const secretStorage = new SecretStorage(context);
  const configRepo = new VSCodeConfigRepository(context);
  const stateManager = new RecordingStateManager();
  
  // Audio subsystem
  const permissionManager = new MicrophonePermissionManager();
  const audioRecorder = new WebviewAudioRecorder(permissionManager, logger);
  
  // Transcription subsystem
  const whisperService = new OpenAIWhisperService(secretStorage, logger);
  const tempFileManager = new TempFileManager();
  
  // Transformation subsystem
  const promptTransformer = new OpenAIPromptTransformer(secretStorage, logger);
  
  // Insertion subsystem
  const editorInserter = new EditorTextInserter(logger);
  const chatInserter = new ChatParticipantInserter(logger);
  const fallbackInserter = new FallbackTextInserter(logger);
  
  // Use cases
  const startRecordingUseCase = new StartRecordingUseCase(
    audioRecorder,
    configRepo,
    logger
  );
  
  const stopRecordingUseCase = new StopRecordingUseCase(
    audioRecorder,
    whisperService,
    promptTransformer,
    editorInserter,
    logger
  );
  
  // UI
  const statusBarItem = new RecordingStatusBarItem(stateManager);
  
  // Commands
  registerCommands(context, startRecordingUseCase, stopRecordingUseCase);
}
```

### Factory for Subsystems

```typescript
// For complex subsystems, use factory functions
function createTranscriptionSubsystem(
  secretStorage: SecretStorage,
  logger: Logger
): ITranscriptionService {
  return new OpenAIWhisperService(secretStorage, logger);
}

function createInsertionSubsystem(logger: Logger): ITextInserter[] {
  return [
    new ChatParticipantInserter(logger),
    new EditorTextInserter(logger),
    new FallbackTextInserter(logger)
  ];
}
```

### Testing with Dependency Injection

```typescript
describe('StartRecordingUseCase', () => {
  it('should start recording when config is valid', async () => {
    // Create mocks
    const mockAudioRecorder: IAudioRecorder = {
      startRecording: jest.fn().mockResolvedValue(undefined),
      stopRecording: jest.fn(),
      cancelRecording: jest.fn(),
      isRecording: jest.fn(),
      getState: jest.fn(),
      onStateChange: jest.fn()
    };
    
    const mockConfig: IConfigRepository = {
      getConfig: jest.fn().mockResolvedValue({ apiKey: 'test-key' })
    };
    
    const mockLogger: ILogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn()
    };
    
    // Inject mocks
    const useCase = new StartRecordingUseCase(
      mockAudioRecorder,
      mockConfig,
      mockLogger
    );
    
    // Execute
    await useCase.execute();
    
    // Verify
    expect(mockAudioRecorder.startRecording).toHaveBeenCalled();
    expect(mockLogger.info).toHaveBeenCalledWith('Recording started successfully');
  });
});
```

---

## References

- [Dependency Injection by Martin Fowler](https://martinfowler.com/articles/injection.html)
- [Dependency Inversion Principle](https://en.wikipedia.org/wiki/Dependency_inversion_principle)
- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)
