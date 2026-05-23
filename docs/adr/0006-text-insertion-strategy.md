# ADR-0006: Chain of Responsibility for Text Insertion

**Status**: Accepted

**Date**: 2026-05-23

**Deciders**: Core Team

**Related**: [ADR-0007](0007-cursor-compatibility.md)

---

## Context

After transcribing and optionally transforming audio to text, we need to insert it somewhere. The challenge is that there are multiple possible destinations:

1. **Cursor Chat Input** - Primary target for Cursor users
2. **Active Text Editor** - Fallback for general editing
3. **Clipboard** - Last resort when other methods fail

Each insertion method has different:
- **Availability**: Chat might not be open, editor might not be active
- **APIs**: Different VSCode APIs for each target
- **Reliability**: Some methods work in more contexts than others
- **User Experience**: Some are more seamless than others

We need a strategy that:
- Tries multiple methods automatically
- Fails gracefully
- Provides good UX regardless of context
- Is extensible for future insertion targets

---

## Decision

**We will implement the Chain of Responsibility pattern with prioritized insertion strategies.**

Key aspects:
- Define `ITextInserter` interface with `canInsert()`, `insert()`, `getPriority()`
- Implement multiple inserters: `ChatParticipantInserter`, `EditorTextInserter`, `FallbackTextInserter`
- Try inserters in priority order until one succeeds
- Each inserter checks if it can handle current context
- Fail gracefully with clipboard fallback

### Interface Design

```typescript
export interface ITextInserter {
  canInsert(): boolean;                // Can this inserter work right now?
  insert(text: string): Promise<boolean>;  // Try to insert, return success
  getPriority(): number;               // Higher priority tried first
}
```

### Chain Implementation

```typescript
export class InsertTextUseCase {
  private inserters: ITextInserter[];

  constructor(
    chatInserter: ChatParticipantInserter,
    editorInserter: EditorTextInserter,
    fallbackInserter: FallbackTextInserter,
    logger: ILogger
  ) {
    // Sort by priority (highest first)
    this.inserters = [chatInserter, editorInserter, fallbackInserter]
      .sort((a, b) => b.getPriority() - a.getPriority());
  }

  async execute(text: string): Promise<boolean> {
    for (const inserter of this.inserters) {
      if (inserter.canInsert()) {
        try {
          const success = await inserter.insert(text);
          if (success) return true;
        } catch (error) {
          // Try next inserter
          continue;
        }
      }
    }
    return false;  // All inserters failed
  }
}
```

### Priority Order

1. **Priority 1** - `ChatParticipantInserter`: Try Cursor chat (most desired)
2. **Priority 2** - `EditorTextInserter`: Try active editor (good fallback)
3. **Priority 3** - `FallbackTextInserter`: Clipboard + notification (always works)

---

## Alternatives Considered

### Alternative 1: Fixed Strategy
- **Description**: Always try chat, then editor, hard-coded logic
- **Pros**:
  - Simple to implement
  - Easy to understand
  - No abstraction overhead
- **Cons**:
  - Hard to extend with new insertion targets
  - Can't configure priority
  - Tightly coupled
  - Hard to test individual strategies
- **Why not chosen**: Not flexible enough for future features

### Alternative 2: Strategy Pattern (Single Strategy)
- **Description**: Configure one active strategy, don't try multiple
- **Pros**:
  - Clean pattern
  - User chooses preference
  - Simple to implement
- **Cons**:
  - Poor UX if chosen strategy doesn't work
  - User has to manually switch strategies
  - Doesn't handle context changes automatically
- **Why not chosen**: Requires too much manual user intervention

### Alternative 3: Observer Pattern
- **Description**: Inserters observe transcription completion, all try at once
- **Pros**:
  - Decoupled
  - Parallel execution possible
- **Cons**:
  - Multiple inserters might succeed (duplicate text)
  - No priority control
  - Race conditions
  - Confusing user experience
- **Why not chosen**: Can cause duplicate insertions

### Alternative 4: Hardcoded If-Else Chain
- **Description**: Simple if-else checks in use case
- **Pros**:
  - Very simple
  - No pattern overhead
  - Easy to debug
- **Cons**:
  - Use case knows about all inserters
  - Hard to add new inserters
  - Violates Open/Closed Principle
  - Not testable in isolation
- **Why not chosen**: Not maintainable as we add insertion targets

---

## Consequences

### Positive Consequences
- **Automatic fallback**: Tries multiple methods without user intervention
- **Extensible**: Easy to add new insertion strategies
- **Testable**: Each inserter can be tested independently
- **Flexible priority**: Can reorder strategies easily
- **Separation of concerns**: Each inserter handles one insertion method
- **Graceful degradation**: Works even in edge cases (clipboard fallback)
- **Context-aware**: Each inserter checks if it's applicable

### Negative Consequences
- **Pattern complexity**: More interfaces and classes
- **Sequential**: Can't try multiple inserters in parallel
- **Over-engineering risk**: Might be overkill if we never add more inserters
- **Debugging**: Need to trace through chain to see which succeeded

### Risks
- **All inserters fail**: Even clipboard might not work
  - **Mitigation**: Clipboard inserter is very reliable
  - **Mitigation**: Show clear error message to user

- **Wrong priority order**: Less desirable inserter wins
  - **Mitigation**: Priorities documented clearly
  - **Mitigation**: Can adjust priorities based on feedback

- **Performance**: Sequential attempts add latency
  - **Mitigation**: Each `canInsert()` is fast (just checks)
  - **Mitigation**: Early exit on first success

### Technical Debt
- None significant. Chain of Responsibility is well-established pattern.

---

## Implementation Notes

### ChatParticipantInserter (Priority 1)

```typescript
export class ChatParticipantInserter implements ITextInserter {
  constructor(private logger: ILogger) {
    this.registerChatParticipant();
  }

  canInsert(): boolean {
    // Check if chat is available and open
    return !!this.chatParticipant && this.isChatContext();
  }

  async insert(text: string): Promise<boolean> {
    try {
      // Try to open chat with text
      await vscode.commands.executeCommand('workbench.action.chat.open', {
        query: text
      });
      return true;
    } catch {
      // Fallback: clipboard + notification
      await vscode.env.clipboard.writeText(text);
      vscode.window.showInformationMessage(
        'Prompt copied. Paste into Cursor chat.',
        'Open Chat'
      );
      return true;  // Consider success (text in clipboard)
    }
  }

  getPriority(): number {
    return 1;  // Highest priority
  }
}
```

### EditorTextInserter (Priority 2)

```typescript
export class EditorTextInserter implements ITextInserter {
  constructor(private logger: ILogger) {}

  canInsert(): boolean {
    const editor = vscode.window.activeTextEditor;
    return !!editor && !editor.document.isUntitled;
  }

  async insert(text: string): Promise<boolean> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return false;

    const success = await editor.edit(editBuilder => {
      editBuilder.insert(editor.selection.active, text);
    });

    return success;
  }

  getPriority(): number {
    return 2;  // Medium priority
  }
}
```

### FallbackTextInserter (Priority 3)

```typescript
export class FallbackTextInserter implements ITextInserter {
  constructor(private logger: ILogger) {}

  canInsert(): boolean {
    return true;  // Clipboard always available
  }

  async insert(text: string): Promise<boolean> {
    await vscode.env.clipboard.writeText(text);
    
    vscode.window.showInformationMessage(
      'Prompt copied to clipboard. Paste it where you need it.',
      'OK'
    );

    this.logger.info('Text copied to clipboard as fallback');
    return true;  // Always succeeds
  }

  getPriority(): number {
    return 3;  // Lowest priority (last resort)
  }
}
```

### Testing

```typescript
describe('InsertTextUseCase', () => {
  it('should try inserters in priority order', async () => {
    const mockChat = {
      canInsert: jest.fn().mockReturnValue(false),  // Can't insert
      insert: jest.fn(),
      getPriority: jest.fn().mockReturnValue(1)
    };

    const mockEditor = {
      canInsert: jest.fn().mockReturnValue(true),  // Can insert
      insert: jest.fn().mockResolvedValue(true),
      getPriority: jest.fn().mockReturnValue(2)
    };

    const mockFallback = {
      canInsert: jest.fn().mockReturnValue(true),
      insert: jest.fn().mockResolvedValue(true),
      getPriority: jest.fn().mockReturnValue(3)
    };

    const useCase = new InsertTextUseCase(
      mockChat as any,
      mockEditor as any,
      mockFallback as any,
      mockLogger
    );

    const result = await useCase.execute('test text');

    expect(result).toBe(true);
    expect(mockChat.canInsert).toHaveBeenCalled();
    expect(mockEditor.canInsert).toHaveBeenCalled();
    expect(mockEditor.insert).toHaveBeenCalledWith('test text');
    expect(mockFallback.canInsert).not.toHaveBeenCalled();  // Stopped early
  });
});
```

---

## References

- [Chain of Responsibility Pattern](https://refactoring.guru/design-patterns/chain-of-responsibility)
- [GoF Design Patterns](https://en.wikipedia.org/wiki/Design_Patterns)
- [Chain of Responsibility in TypeScript](https://refactoring.guru/design-patterns/chain-of-responsibility/typescript/example)
