# ADR-0002: Adopt Clean/Hexagonal Architecture

**Status**: Accepted

**Date**: 2026-05-23

**Deciders**: Core Team

**Related**: [ADR-0004](0004-dependency-injection.md)

---

## Context

We need to decide on the architectural pattern for Promptimize. The extension has significant complexity:

- **Multiple external integrations**: OpenAI Whisper, GPT-4, VSCode APIs, Audio APIs
- **Complex business logic**: Recording state management, transcription, transformation
- **Long-term evolution**: Features planned through v1.0 and beyond
- **Testability requirements**: Need to test business logic independently
- **Multiple UI surfaces**: Status bar, webview, commands
- **Potential for alternative implementations**: Different STT providers, multiple transformation engines

Key goals:
1. **Maintainability**: Easy to understand and modify
2. **Testability**: Business logic isolated from frameworks
3. **Flexibility**: Easy to swap implementations
4. **Scalability**: Can grow without becoming unmaintainable
5. **Clear boundaries**: Each layer has well-defined responsibilities

---

## Decision

**We will adopt Clean/Hexagonal Architecture with four distinct layers:**

1. **Domain Layer**: Pure business entities and logic
2. **Application Layer**: Use cases and ports (interfaces)
3. **Infrastructure Layer**: External integrations and implementations
4. **Presentation Layer**: UI, commands, and user interaction

### Layer Structure

```
src/
├── domain/              # Entities, Value Objects, Business Rules
│   ├── entities/
│   ├── value-objects/
│   └── errors/
│
├── application/         # Use Cases, Ports (Interfaces), DTOs
│   ├── use-cases/
│   ├── ports/
│   └── dto/
│
├── infrastructure/      # Adapters, External Service Implementations
│   ├── audio/
│   ├── transcription/
│   ├── transformation/
│   ├── insertion/
│   ├── config/
│   └── storage/
│
├── presentation/        # UI, Commands, VSCode Integration
│   ├── commands/
│   ├── webview/
│   ├── status-bar/
│   └── views/
│
└── shared/             # Cross-cutting concerns
    ├── constants/
    ├── utils/
    └── types/
```

### Dependency Rules

1. **Domain** depends on nothing (pure TypeScript)
2. **Application** depends only on Domain
3. **Infrastructure** depends on Application and Domain
4. **Presentation** depends on Application and Domain
5. **Infrastructure** and **Presentation** can depend on external frameworks
6. Dependencies point inward (Dependency Inversion Principle)

---

## Alternatives Considered

### Alternative 1: Layered Architecture (Traditional MVC)
- **Description**: Classic three-layer architecture (Model-View-Controller)
- **Pros**:
  - Simpler to understand initially
  - Fewer files and folders
  - Less ceremony for small features
  - Familiar to most developers
- **Cons**:
  - Domain logic tends to leak into controllers/views
  - Hard to test without frameworks
  - Difficult to swap implementations
  - Becomes messy as codebase grows
  - Framework coupling makes testing hard
- **Why not chosen**: Doesn't support our testability and flexibility requirements

### Alternative 2: Feature-Based Organization
- **Description**: Organize by feature (recording/, transcription/, etc.) rather than layer
- **Pros**:
  - Related code lives together
  - Easy to find feature-specific code
  - Can develop features independently
  - Works well for small teams
- **Cons**:
  - Shared logic harder to identify
  - Cross-cutting concerns duplicated
  - Boundaries between features blur over time
  - Infrastructure concerns scattered
  - Harder to enforce architectural rules
- **Why not chosen**: Our features share significant infrastructure (OpenAI, audio, state)

### Alternative 3: Flat Structure
- **Description**: Minimal organization, everything in src/
- **Pros**:
  - Simplest possible structure
  - No ceremony
  - Fast to start
- **Cons**:
  - Becomes unmaintainable quickly
  - No clear boundaries
  - Testing is ad-hoc
  - Hard to onboard new contributors
  - Coupling inevitable
- **Why not chosen**: Not suitable for complex, long-term projects

---

## Consequences

### Positive Consequences
- **High testability**: Business logic testable without frameworks
- **Flexibility**: Easy to swap OpenAI for alternative STT providers
- **Clear responsibilities**: Each layer has well-defined job
- **Independent deployment**: Layers can be developed in parallel
- **Framework independence**: Core logic not tied to VSCode APIs
- **Easy to onboard**: Clear structure helps new contributors
- **Scalable**: Can add features without structural changes
- **Maintainable**: Changes localized to specific layers

### Negative Consequences
- **Initial complexity**: More files and folders than simpler patterns
- **Learning curve**: Team needs to understand Clean Architecture
- **More interfaces**: Ports/adapters add abstraction
- **Navigation overhead**: More folders to navigate
- **Potential over-engineering**: Small features feel heavyweight
- **Indirection**: Following flow requires jumping through layers

### Risks
- **Over-abstraction**: Risk of creating unnecessary interfaces
  - **Mitigation**: Create interfaces only when multiple implementations exist or are planned
  - **Mitigation**: Start concrete, extract interface when needed
  
- **Inconsistent application**: Developers bypass architecture
  - **Mitigation**: Code reviews enforce layer boundaries
  - **Mitigation**: ESLint rules prevent cross-layer violations
  - **Mitigation**: Documentation with clear examples

- **Premature optimization**: Abstracting things that won't change
  - **Mitigation**: YAGNI principle - add abstraction when needed, not speculatively

### Technical Debt
- None significant if followed correctly
- Refactoring to Clean Architecture from another pattern would be significant debt

---

## Implementation Notes

### Dependency Flow Example

```
Presentation Layer (StartRecordingCommand)
    ↓ depends on
Application Layer (StartRecordingUseCase)
    ↓ depends on
Application Layer Port (IAudioRecorder interface)
    ↑ implemented by
Infrastructure Layer (NativeAudioRecorder)
```

### Port/Adapter Pattern

```typescript
// Application layer defines port (interface)
export interface IAudioRecorder {
  startRecording(): Promise<void>;
  stopRecording(): Promise<AudioData>;
}

// Infrastructure layer provides adapter (implementation)
export class NativeAudioRecorder implements IAudioRecorder {
  async startRecording(): Promise<void> { /* ... */ }
  async stopRecording(): Promise<AudioData> { /* ... */ }
}
```

### Use Case Pattern

```typescript
// Application layer use case
export class StartRecordingUseCase {
  constructor(
    private audioRecorder: IAudioRecorder,  // Port injection
    private config: IConfigRepository,      // Port injection
    private logger: ILogger                 // Port injection
  ) {}

  async execute(): Promise<void> {
    // Pure business logic
    const config = await this.config.getConfig();
    if (!config.apiKey) {
      throw new ConfigError('API key not configured');
    }
    
    await this.audioRecorder.startRecording();
  }
}
```

### Layer Interaction Rules

1. **Domain**: Never import from other layers
2. **Application**: Only import from Domain
3. **Infrastructure**: Import from Application/Domain, implement ports
4. **Presentation**: Import from Application/Domain, orchestrate use cases

### Testing Strategy

- **Domain**: Unit test pure logic
- **Application**: Unit test with mocked ports
- **Infrastructure**: Integration test with real services
- **Presentation**: E2E test user flows

---

## References

- [Clean Architecture by Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Hexagonal Architecture (Herberto Graca)](https://herbertograca.com/2017/11/16/explicit-architecture-01-ddd-hexagonal-onion-clean-cqrs-how-i-put-it-all-together/)
- [Ports and Adapters Pattern](https://herbertograca.com/2017/09/14/ports-adapters-architecture/)
- [Clean Architecture in TypeScript](https://medium.com/@pankaj.panigrahi/clean-architecture-in-typescript-node-js-a9e7aa3ebe6f)
