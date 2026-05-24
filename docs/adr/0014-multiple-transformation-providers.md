# ADR-0014: Multiple Transformation Providers

**Status**: Accepted

**Date**: 2026-05-23

**Deciders**: Core Team

**Related**: [ADR-0011](0011-gpt4-transformation.md), [ADR-0003](0003-openai-whisper.md)

---

## Context

Promptimize originally used OpenAI GPT models exclusively for prompt transformation after Whisper transcription. Users requested flexibility to choose alternative LLM providers based on cost, privacy, availability, or organizational requirements.

Requirements:

- Support multiple LLM providers for prompt transformation
- Keep OpenAI Whisper as the sole transcription provider
- Maintain backward compatibility with existing OpenAI-only configurations
- Follow Clean Architecture with swappable adapters behind `IPromptTransformer`

---

## Decision

**We will support multiple transformation providers via a factory pattern:**

| Provider | Use Case |
|----------|----------|
| OpenAI | Default; same API key as Whisper |
| Anthropic | Claude models for high-quality structuring |
| Google Gemini | Cost-effective cloud alternative |
| Azure OpenAI | Enterprise deployments on Azure |
| Ollama | Local/offline inference |
| OpenCode | Local multi-provider gateway via opencode-llm-proxy |
| OpenRouter | Cloud gateway to 200+ models with one API key |
| Cursor | Native Cursor AI models via Cursor SDK |

Key aspects:

- `PromptTransformerFactory` resolves the active provider from configuration
- Provider-specific API keys stored in VSCode SecretStorage (`promptimize.apiKey.{provider}`)
- Provider selection via settings (`promptimize.transformationProvider`) and command palette
- Shared system prompt and improvement heuristics across providers
- No automatic fallback to another provider on failure (user must opt in via settings in future)

---

## Alternatives Considered

### Alternative 1: OpenAI Only

- **Pros**: Simplest, single API key, consistent quality
- **Cons**: Vendor lock-in, no local option, limits user choice
- **Why not chosen**: Does not address user request (Issue #1)

### Alternative 2: Unified API Gateway (LiteLLM, etc.)

- **Pros**: Single integration point for many providers
- **Cons**: Additional dependency, harder to debug, overkill for VSCode extension
- **Why not chosen**: Direct SDK integrations are clearer and more maintainable

### Alternative 3: Multiple Transcription Providers

- **Pros**: Full provider flexibility
- **Cons**: Out of scope for Issue #1; Whisper quality is sufficient
- **Why not chosen**: Explicitly deferred; transcription stays on Whisper

---

## Consequences

### Positive

- Users can choose providers matching their budget and privacy needs
- Clean Architecture ports already supported this extension
- Ollama enables fully local transformation (no cloud for optimization step)
- Provider-specific keys allow easy switching without reconfiguration

### Negative

- Increased codebase complexity (8 provider adapters)
- More configuration surface area for users
- Quality and latency vary by provider
- Additional SDK dependencies to maintain

### Risks

- **Provider API changes**: Pin SDK versions, add unit tests with mocks
- **Configuration confusion**: Mitigated by `Configure Transformation Provider` command and docs
- **Azure setup complexity**: Document endpoint/deployment requirements clearly

---

## Implementation Notes

- Factory: `src/infrastructure/transformation/PromptTransformerFactory.ts`
- Value object: `src/domain/value-objects/TransformationProvider.ts`
- Config: `promptimize.transformationProvider` and provider-specific model settings
- OpenCode and OpenRouter use the OpenAI SDK with custom `baseURL` (OpenAI-compatible APIs)
- Cursor uses `@cursor/sdk` with `Agent.prompt()` for one-shot transformations
- Commands: `promptimize.configureTransformationProvider`, `promptimize.testTransformation`

---

## References

- [GitHub Issue #1](https://github.com/vypdev/cursor-whisper/issues/1)
- [Configuration guide](../configuration/README.md)
