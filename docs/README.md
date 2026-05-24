# Cursor Whisper Documentation

Documentation for the Cursor Whisper VSCode/Cursor extension.

---

## Documentation Structure

### User guides

| Document | Purpose |
|----------|---------|
| [Quick Start](quickstart.md) | Install, first recording, troubleshooting |
| [Recording Modes](user-guide/recording-modes.md) | Transcribe vs Promptimize workflows |
| [Keyboard Shortcuts](user-guide/keyboard-shortcuts.md) | Keybindings and Command Palette reference |
| [Troubleshooting](user-guide/troubleshooting.md) | Decision trees for common issues |
| [Configuration Guide](configuration/README.md) | Whisper setup, optimization providers, settings |
| [Configuration Webview](configuration/webview-guide.md) | Interactive setup panel features |
| [Provider Selection](configuration/provider-selection.md) | When to use which provider |
| [Advanced Settings](configuration/advanced-settings.md) | Transcription hints, planned settings, test output |

### Architecture & design

| Document | Purpose |
|----------|---------|
| [Architecture Overview](architecture/overview.md) | Layers, components, data flow |
| [Architecture Decision Records](adr/) | Why key technical choices were made |
| [Complete Flow](flows/complete-flow.md) | End-to-end runtime behavior |

### Operations

| Document | Purpose |
|----------|---------|
| [Testing Strategy](testing/strategy.md) | Test priorities and manual smoke checklist |
| [Release Process](deployment/release-process.md) | Build, package, and publish |
| [Coding Conventions](standards/coding-conventions.md) | Naming, structure, review checklist |

### Other

| Document | Purpose |
|----------|---------|
| [UX States](ux/states.md) | Status bar states, notifications, error copy |
| [Security & Privacy](security/privacy.md) | Data handling, API keys, threat model |
| [Technical Research](research/technical-investigation.md) | API constraints, Cursor compatibility findings |

Implementation details live in [`src/`](../src/) with TypeScript types and JSDoc.

---

## Quick Navigation

### For users

1. [Quick Start](quickstart.md)
2. [Recording Modes](user-guide/recording-modes.md)
3. [Configuration Webview](configuration/webview-guide.md)
4. [Configuration Guide](configuration/README.md)
5. [Troubleshooting](user-guide/troubleshooting.md)

### For contributors

1. [Architecture Overview](architecture/overview.md)
2. [ADRs](adr/) for key decisions
3. [Complete Flow](flows/complete-flow.md)
4. [Testing Strategy](testing/strategy.md)
5. Browse [`src/`](../src/) for implementation

### For maintainers

1. [Release Process](deployment/release-process.md)
2. [Project Progress](../PROGRESS.md)
3. Update [ADRs](adr/) when making architectural changes

---

## Keeping Documentation Updated

| Change type | Update |
|-------------|--------|
| Architecture | `architecture/overview.md` + new ADR |
| User-facing features | `user-guide/`, `configuration/`, `quickstart.md`, root `README.md` |
| Bug fixes (user-facing) | `user-guide/troubleshooting.md`, root `README.md` |
| Release process | `deployment/release-process.md` |

Documentation changes belong in the same PR as code changes when behavior changes.

---

## External Resources

- [VSCode Extension API](https://code.visualstudio.com/api)
- [OpenAI Whisper API](https://platform.openai.com/docs/guides/speech-to-text)
- [Clean Architecture (Robert C. Martin)](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
