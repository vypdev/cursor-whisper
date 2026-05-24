# Coding Standards and Conventions

**Last Updated**: 2026-05-24

Tooling configuration lives in the repo root — do not duplicate it here:

- TypeScript: [`tsconfig.json`](../../tsconfig.json)
- ESLint: [`.eslintrc.js`](../../.eslintrc.js)
- Prettier: [`.prettierrc`](../../.prettierrc)
- Jest: [`jest.config.js`](../../jest.config.js)

---

## Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| **Interfaces (ports)** | PascalCase, prefix `I` | `IAudioRecorder`, `ILogger` |
| **Classes** | PascalCase | `Recording`, `OpenAIWhisperService` |
| **Types / Enums** | PascalCase | `RecordingState`, `TransformationProvider` |
| **Functions / variables** | camelCase | `startRecording`, `audioData` |
| **Constants** | SCREAMING_SNAKE_CASE | `MAX_RECORDING_DURATION` |
| **Files** | PascalCase for classes | `StartRecordingUseCase.ts` |

---

## Code Organization

Follow Clean Architecture layer boundaries. See [Architecture Overview](../architecture/overview.md).

```
src/
├── domain/           # Entities, value objects, errors — no framework imports
├── application/      # Use cases, ports, DTOs
├── infrastructure/   # Port implementations, external integrations
├── presentation/     # Commands, status bar, webviews
└── shared/           # Constants, utilities
```

**Import order:** Node built-ins → external packages → domain → application → infrastructure → shared → types

**Dependency rule:** Domain and application must not import infrastructure or presentation. Enforced via ESLint `no-restricted-imports`.

---

## Documentation

Add JSDoc to public interfaces and non-obvious behavior. Implementation details belong in code comments, not separate markdown mirrors.

---

## Error Handling

- Extend `Error` for domain-specific errors; preserve `cause` and stack traces
- Catch specific error types in use cases; map to user-facing messages in presentation
- Use `ILogger` — no `console.log` in production code

---

## Testing

- Test files: `src/__tests__/` mirroring source structure
- Naming: `FeatureName.test.ts`
- Pattern: Arrange-Act-Assert; mock ports, not internals
- See [Testing Strategy](../testing/strategy.md)

---

## Git Conventions

**Commits:** `<type>(<scope>): <subject>` — e.g. `feat(recording): add push-to-talk mode`

**Types:** `feat`, `fix`, `docs`, `refactor`, `test`, `chore`

**Branches:** `<type>/<description>` — e.g. `feat/prompt-transformation`

---

## Code Review Checklist

- [ ] Correct layer; dependencies point inward
- [ ] Types explicit (no `any`)
- [ ] Error handling and tests for new behavior
- [ ] No secrets or transcription content in logs
- [ ] Documentation updated if user-facing behavior changed

---

**Related:** [Architecture Overview](../architecture/overview.md) · [Testing Strategy](../testing/strategy.md)
