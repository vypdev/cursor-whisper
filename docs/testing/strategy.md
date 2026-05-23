# Testing Strategy

**Last Updated**: 2026-05-23

---

## Overview

Cursor Whisper uses a focused testing strategy aligned with the **stop → transcribe → transform → insert** pipeline.

**Testing philosophy**: Test behavior at integration boundaries, not implementation details.

**Current status**: Jest is configured (`jest.config.js`, `__tests__/setup.ts`) but automated tests are not yet implemented. See [`PROGRESS.md`](../../PROGRESS.md).

---

## Test Pyramid (Target)

```
        /\
       /  \      Manual smoke tests (5%)
      /    \     - Real mic + OpenAI in dev only
     /------\
    /        \   Integration tests (20%)
   /          \  - Mocked pipeline chain
  /            \
 /______________\
Unit Tests (75%)
- Use cases + domain with mocked ports
- Fast, deterministic
```

---

## Critical Test Priorities

These tests protect the core value of the extension. Implement in this order.

### Tier 1 — Pipeline use cases (highest ROI)

| Target | What to verify |
|--------|----------------|
| `InsertTextUseCase` | Chain of responsibility: chat → editor → clipboard; `InsertionError` when all fail |
| `TransformPromptUseCase` | Transformation disabled → passthrough; GPT failure → fallback to raw text |
| `TranscribeAudioUseCase` | Config options passed to service; audio > 25 MB → `AudioTooLargeError` |
| `StopRecordingUseCase` | Returns `AudioData`; errors when not recording |
| `StartRecordingUseCase` | `MissingApiKeyError`; no start when already recording; permission/recorder errors |
| Pipeline slice | Mocked stop → transcribe → transform → insert; `insert` receives `transformedText` |

### Tier 2 — Infrastructure adapters (mock externals)

| Target | What to verify |
|--------|----------------|
| `OpenAIWhisperService.validateAudioFile()` | Empty buffer, duration < 0.1s, oversized file |
| `OpenAIWhisperService.transcribe()` | Mock OpenAI client; error mapping (401, 429) |
| `OpenAIPromptTransformer.transform()` | Mock completion; context (`editorLanguage`) in prompt |
| Text inserters | `EditorTextInserter`, `FallbackTextInserter`, `ChatParticipantInserter` with mocked `vscode` |

### Tier 3 — Audio encoding

| Target | What to verify |
|--------|----------------|
| `NativeAudioRecorder` | WAV encoding from PCM; permission error classification (mock `@kstonekuan/audio-capture`) |

### Deferred (low priority for MVP)

- **`Recording` entity** — not used in the live pipeline today
- **`WebviewAudioRecorder`** — deprecated; kept as fallback only ([ADR-0013](../adr/0013-native-audio-capture.md))
- **Full E2E in VS Code/Cursor** — manual smoke before release
- **Cross-platform CI matrix** — after unit tests exist

---

## Example: Use Case Test

```typescript
// __tests__/application/use-cases/InsertTextUseCase.test.ts
import { InsertTextUseCase, InsertionError } from '../../../src/application/use-cases/InsertTextUseCase';
import { ITextInserter } from '../../../src/application/ports/ITextInserter';
import { ILogger } from '../../../src/application/ports/ILogger';

describe('InsertTextUseCase', () => {
  const mockLogger: ILogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    setLevel: jest.fn(),
  };

  it('should try inserters in priority order until one succeeds', async () => {
    const chat: jest.Mocked<ITextInserter> = {
      canInsert: jest.fn().mockReturnValue(true),
      insert: jest.fn().mockResolvedValue(false),
      getPriority: jest.fn().mockReturnValue(1),
    };
    const editor: jest.Mocked<ITextInserter> = {
      canInsert: jest.fn().mockReturnValue(true),
      insert: jest.fn().mockResolvedValue(true),
      getPriority: jest.fn().mockReturnValue(2),
    };

    const useCase = new InsertTextUseCase([editor, chat], mockLogger);
    await useCase.execute('Hello world');

    expect(chat.insert).toHaveBeenCalled();
    expect(editor.insert).toHaveBeenCalled();
  });

  it('should throw InsertionError when all inserters fail', async () => {
    const inserter: jest.Mocked<ITextInserter> = {
      canInsert: jest.fn().mockReturnValue(true),
      insert: jest.fn().mockResolvedValue(false),
      getPriority: jest.fn().mockReturnValue(1),
    };

    const useCase = new InsertTextUseCase([inserter], mockLogger);
    await expect(useCase.execute('text')).rejects.toThrow(InsertionError);
  });
});
```

---

## Manual Smoke Tests (Before Release)

Run these manually with a real OpenAI API key:

1. **Happy path**: Configure API key → record → stop → text appears in editor or chat
2. **Missing API key**: Start recording without key → configuration prompt shown
3. **Fallback insertion**: Close all editors → record → stop → text on clipboard
4. **Cancellation**: Start recording → press Escape → returns to idle
5. **Short recording**: Record < 0.5s → appropriate error message

---

## Jest Configuration

Existing config: [`jest.config.js`](../../jest.config.js)

- Preset: `ts-jest`, environment: `node`
- VSCode APIs mocked in [`__tests__/setup.ts`](../../__tests__/setup.ts)
- Coverage thresholds defined but not yet met (tests pending)

---

## Best Practices

### DO

- Test behavior (outcomes, errors thrown, port calls)
- Mock external dependencies (OpenAI, VSCode, native audio)
- Use Arrange-Act-Assert pattern
- Keep unit tests fast (< 5 ms each)

### DON'T

- Log or assert on full transcription/prompt text in tests
- Test private methods directly
- Use real OpenAI API calls in automated tests
- Duplicate manual smoke scenarios in flaky integration tests

---

## Coverage Goals (When Tests Exist)

| Layer | Line Coverage | Branch Coverage |
|-------|--------------|----------------|
| Domain | 90%+ | 85%+ |
| Application | 90%+ | 85%+ |
| Infrastructure | 50%+ | 40%+ |
| Presentation | 30%+ | 25%+ |
| **Overall** | **70%+** | **60%+** |

Focus coverage on Tier 1 use cases before chasing presentation-layer percentages.

---

**Next**: See [Deployment Documentation](../deployment/release-process.md).
