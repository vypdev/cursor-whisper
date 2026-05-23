# Architecture Decision Records (ADRs)

This directory contains Architecture Decision Records for Cursor Whisper.

## What is an ADR?

An Architecture Decision Record (ADR) is a document that captures an important architectural decision made along with its context and consequences.

## Why ADRs?

- **Document decisions**: Capture the "why" behind architectural choices
- **Provide context**: Help future contributors understand past reasoning
- **Enable review**: Allow stakeholders to review and discuss decisions
- **Track evolution**: Show how architecture evolved over time

## ADR Format

Each ADR follows this structure:

1. **Title**: Short noun phrase
2. **Status**: Proposed, Accepted, Deprecated, Superseded
3. **Context**: What is the issue we're facing?
4. **Decision**: What is the change we're proposing/doing?
5. **Consequences**: What becomes easier or harder?

## ADR List

### Active ADRs

- [ADR-0001](0001-use-typescript.md) - Use TypeScript for Extension Development
- [ADR-0002](0002-clean-architecture.md) - Adopt Clean/Hexagonal Architecture
- [ADR-0003](0003-openai-whisper.md) - Use OpenAI Whisper for Transcription
- [ADR-0004](0004-dependency-injection.md) - Implement Dependency Injection Pattern
- [ADR-0005](0005-webview-audio-recording.md) - Use Webview with MediaRecorder for Audio Capture (Superseded)
- [ADR-0006](0006-text-insertion-strategy.md) - Chain of Responsibility for Text Insertion
- [ADR-0007](0007-cursor-compatibility.md) - Prioritize Classic Mode Compatibility
- [ADR-0008](0008-secret-storage.md) - Use VSCode SecretStorage for API Keys
- [ADR-0009](0009-no-persistent-audio.md) - No Persistent Audio Storage
- [ADR-0010](0010-react-for-ui.md) - Use React for Webview UI (Superseded)
- [ADR-0011](0011-gpt4-transformation.md) - Use GPT-4 for Prompt Transformation
- [ADR-0012](0012-mono-audio-16khz.md) - Use Mono Audio at 16kHz Sample Rate
- [ADR-0013](0013-native-audio-capture.md) - Use Native Audio Capture with @kstonekuan/audio-capture

### Proposed ADRs

- None currently

### Superseded ADRs

- [ADR-0005](0005-webview-audio-recording.md) - Superseded by [ADR-0013](0013-native-audio-capture.md)
- [ADR-0010](0010-react-for-ui.md) - Superseded by [ADR-0013](0013-native-audio-capture.md) (webview UI never implemented)

---

## Creating a New ADR

1. Copy `template.md` to new file: `XXXX-title-in-kebab-case.md`
2. Number sequentially from last ADR
3. Fill in all sections
4. Submit for review via PR
5. Update this index

---

## ADR Lifecycle

```
Proposed → Accepted → [Deprecated | Superseded]
```

- **Proposed**: Under discussion, not yet implemented
- **Accepted**: Decision made and being/been implemented
- **Deprecated**: No longer recommended but not yet replaced
- **Superseded**: Replaced by a newer ADR

---

## Related Reading

- [Michael Nygard's ADR article](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
- [ADR GitHub organization](https://adr.github.io/)
