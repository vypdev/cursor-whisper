# Testing Strategy

**Last Updated**: 2026-05-24

---

## Overview

Cursor Whisper uses a focused testing strategy aligned with the **stop → transcribe → transform → insert** pipeline.

**Testing philosophy**: Test behavior at integration boundaries, not implementation details.

**Current status**: Jest is configured with 12+ test files under `src/__tests__/`, covering use cases, transformers, native audio, and provider switching. Run `pnpm test` from the repo root (Node 22 via nvm).

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

## Existing Test Coverage

| Area | Test files |
|------|------------|
| Use cases | `StartRecordingUseCase.test.ts` |
| Configuration | `ConfigurationValidationService.test.ts` |
| Transformers | `Anthropic`, `Azure`, `Google`, `Ollama`, `OpenAI`, `PromptTransformerFactory`, `transformationUtils` |
| Integration | `providerSwitching.test.ts` |
| Audio | `NativeAudioRecorder.test.ts` |
| Presentation | `RecordingStatusBarItem.test.ts` |
| Domain | `TransformationProvider.test.ts` |

---

## Critical Test Priorities

These tests protect the core value of the extension. Expand coverage in this order.

### Tier 1 — Pipeline use cases (highest ROI)

| Target | What to verify |
|--------|----------------|
| `InsertTextUseCase` | Chain of responsibility: chat → editor → clipboard; `InsertionError` when all fail |
| `TransformPromptUseCase` | Transformation disabled → passthrough; failure → fallback to raw text |
| `TranscribeAudioUseCase` | Config options passed to service; audio > 25 MB → `AudioTooLargeError` |
| `StopRecordingUseCase` | Returns `AudioData`; errors when not recording |
| `StartRecordingUseCase` | `MissingApiKeyError`; no start when already recording; permission/recorder errors |
| Pipeline slice | Mocked stop → transcribe → transform → insert; `insert` receives `transformedText` |

### Tier 2 — Infrastructure adapters (mock externals)

| Target | What to verify |
|--------|----------------|
| `OpenAIWhisperService.validateAudioFile()` | Empty buffer, duration < 0.1s, oversized file |
| `OpenAIWhisperService.transcribe()` | Mock OpenAI client; error mapping (401, 429) |
| Prompt transformers | Mock completion; context in system prompt |
| Text inserters | `EditorTextInserter`, `FallbackTextInserter`, `ChatParticipantInserter` with mocked `vscode` |

### Tier 3 — Audio encoding

| Target | What to verify |
|--------|----------------|
| `NativeAudioRecorder` | WAV encoding from PCM; permission error classification |

### Deferred

- **Full E2E in VS Code/Cursor** — manual smoke before release
- **Cross-platform CI matrix** — after core unit coverage is solid

---

## Manual Smoke Tests (Before Release)

Run these manually with a real OpenAI API key:

1. **Happy path**: Configure API key → record → stop → text appears in editor or chat
2. **Missing API key**: Start recording without key → configuration prompt shown
3. **Fallback insertion**: Close all editors → record → stop → text on clipboard
4. **Cancellation**: Start recording → press Escape → returns to idle
5. **Short recording**: Record < 0.5s → appropriate error message
6. **Provider switching**: Change optimization provider → verify transformation uses new provider

---

## Configuration

- Jest config: [`jest.config.js`](../../jest.config.js)
- VSCode API mocks: [`__tests__/setup.ts`](../../__tests__/setup.ts)
- Run: `source scripts/ensure-node.sh && pnpm test`

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

## Coverage Goals

| Layer | Line Coverage | Branch Coverage |
|-------|--------------|----------------|
| Domain | 90%+ | 85%+ |
| Application | 90%+ | 85%+ |
| Infrastructure | 50%+ | 40%+ |
| Presentation | 30%+ | 25%+ |
| **Overall** | **70%+** | **60%+** |

Focus coverage on Tier 1 use cases before chasing presentation-layer percentages.

---

**Next**: [Release Process](../deployment/release-process.md)
