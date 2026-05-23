# ADR-0001: Use TypeScript for Extension Development

**Status**: Accepted

**Date**: 2026-05-23

**Deciders**: Core Team

**Related**: N/A

---

## Context

VSCode extensions can be written in JavaScript or TypeScript. We need to decide which language to use for Cursor Whisper.

Key considerations:
- **Type safety**: Complex business logic around audio, transcription, and transformations
- **Maintainability**: Extension expected to grow significantly
- **Developer experience**: IntelliSense, refactoring, error detection
- **VSCode ecosystem**: Most modern extensions use TypeScript
- **Team expertise**: Team is comfortable with TypeScript

The extension involves:
- Multiple layers (domain, application, infrastructure, presentation)
- Complex state management (recording states, async operations)
- Integration with external APIs (OpenAI Whisper, GPT-4)
- Browser APIs (MediaRecorder, Web Audio)
- VSCode Extension API
- React for UI components

---

## Decision

**We will use TypeScript 5.4+ for all extension code.**

Key aspects:
- Strict mode enabled (`"strict": true`)
- No implicit any (`"noImplicitAny": true`)
- Strict null checks (`"strictNullChecks": true`)
- ES2022 target for modern features
- Full type coverage for all modules
- Type definitions for all external dependencies

---

## Alternatives Considered

### Alternative 1: JavaScript with JSDoc
- **Description**: Use modern JavaScript with JSDoc type annotations
- **Pros**:
  - No build step required
  - Slightly faster development iteration
  - More flexible for rapid prototyping
- **Cons**:
  - Weaker type safety (optional typing)
  - No compile-time type checking
  - Harder to refactor safely
  - Inconsistent type coverage
  - More runtime errors
- **Why not chosen**: Type safety is critical for this complex extension

### Alternative 2: Flow
- **Description**: Use Facebook's Flow type system
- **Pros**:
  - Strong type checking
  - Similar to TypeScript
- **Cons**:
  - Smaller ecosystem
  - Less tooling support in VSCode
  - Declining community adoption
  - Fewer type definitions available
  - Not standard in VSCode extension development
- **Why not chosen**: TypeScript is the de-facto standard for VSCode extensions

---

## Consequences

### Positive Consequences
- **Catch errors at compile time**: Type errors found before runtime
- **Better IntelliSense**: Autocomplete, parameter hints, documentation
- **Safer refactoring**: Rename, move, extract with confidence
- **Self-documenting**: Types serve as inline documentation
- **Easier onboarding**: New contributors understand interfaces quickly
- **Reduced bugs**: Type system prevents entire classes of errors
- **Better IDE support**: VSCode's TypeScript integration is excellent

### Negative Consequences
- **Build step required**: Need to compile TypeScript to JavaScript
- **Slightly slower iteration**: Compilation adds time (mitigated by watch mode)
- **Learning curve**: Contributors must know TypeScript (minimal for JS devs)
- **Type definition maintenance**: Need to keep types updated with code
- **Configuration complexity**: `tsconfig.json` needs careful setup

### Risks
- **Over-typing**: Risk of overly complex type definitions
  - **Mitigation**: Code review, prefer simple types, avoid type gymnastics
- **Build tooling issues**: TypeScript compiler might have bugs
  - **Mitigation**: Use stable, LTS version of TypeScript

### Technical Debt
- None significant. TypeScript is widely supported and actively maintained.

---

## Implementation Notes

### Configuration
Create `tsconfig.json` with:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "lib": ["ES2022"],
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./out",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "out"]
}
```

### Build Scripts
- `npm run compile`: Build once
- `npm run watch`: Watch mode for development
- `npm run lint`: ESLint with TypeScript parser

### Type Definitions
- Install `@types/vscode` for VSCode API
- Install `@types/node` for Node.js APIs
- Use official type definitions where available
- Create custom type definitions in `src/shared/utils/` or alongside domain/application modules

---

## References

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [VSCode Extension TypeScript Guide](https://code.visualstudio.com/api/working-with-extensions/bundling-extension#using-webpack)
- [TypeScript Best Practices](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
