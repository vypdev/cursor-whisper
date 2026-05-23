# Cursor Whisper

> **Transform your voice into optimized prompts with AI-powered speech-to-text**

A professional VSCode/Cursor extension that captures audio from your microphone, transcribes it using OpenAI Whisper, and intelligently transforms natural speech into structured, optimized prompts ready for LLM agents.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-0.1.0--alpha-orange.svg)
![VSCode](https://img.shields.io/badge/VSCode-1.120+-green.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4+-blue.svg)

---

## 🎯 Vision

**Eliminate the friction between thinking and coding.**

Developers often have complex architectural ideas, detailed requirements, or intricate technical explanations that are tedious to type but natural to speak. Cursor Whisper bridges this gap by:

- **Capturing** your spoken thoughts in real-time
- **Transcribing** them with high accuracy using OpenAI Whisper
- **Transforming** natural speech into structured, technical prompts
- **Inserting** them automatically into your editor or Cursor chat

---

## 🔥 The Problem We Solve

### Before Cursor Whisper:
```
1. Think about complex architecture requirements
2. Struggle to type everything out
3. Lose train of thought while typing
4. End up with unstructured, verbose prompts
5. LLM misunderstands due to poor formatting
```

### With Cursor Whisper:
```
1. Press Cmd+Alt+V
2. Speak naturally about your requirements
3. Extension transcribes and optimizes automatically
4. Structured prompt appears in your editor/chat
5. LLM understands perfectly
```

---

## ✨ Features

### Current (v0.1.0-alpha)

- ✅ **One-Click Recording** - Status bar button or keyboard shortcut
- ✅ **High-Quality Transcription** - OpenAI Whisper API integration
- ✅ **Smart Insertion** - Automatically inserts into active editor
- ✅ **Visual Feedback** - Clear state indicators (idle, recording, processing)
- ✅ **Secure Configuration** - API keys stored securely in VSCode SecretStorage
- ✅ **Cross-Platform** - Works on macOS, Windows, and Linux

### Coming Soon

- 🔄 **Prompt Transformation** - AI-powered optimization of transcribed text
- 🔄 **Chat Integration** - Direct insertion into Cursor chat input
- 🔄 **Real-time Streaming** - See transcription as you speak
- 🔄 **Multi-language Support** - Auto-detect or manually configure language
- 🔄 **Custom Vocabulary** - Project-specific terms and acronyms
- 🔄 **Recording History** - Review and re-use past transcriptions

---

## 🏗️ Architecture

Cursor Whisper follows **Clean/Hexagonal Architecture** for maximum maintainability, testability, and scalability.

```
┌─────────────────────────────────────────────────────┐
│                  Presentation Layer                  │
│  (Commands, Status Bar)                              │
└────────────┬────────────────────────────────────────┘
             │
┌────────────▼────────────────────────────────────────┐
│                  Application Layer                   │
│      (Use Cases, Ports/Interfaces, DTOs)            │
└────────────┬────────────────────────────────────────┘
             │
┌────────────▼────────────────────────────────────────┐
│                    Domain Layer                      │
│    (Entities, Value Objects, Business Logic)         │
└─────────────────────────────────────────────────────┘
             │
┌────────────▼────────────────────────────────────────┐
│                Infrastructure Layer                  │
│  (OpenAI Whisper, Native Audio Capture, Config, Storage) │
└─────────────────────────────────────────────────────┘
```

See [`docs/architecture/`](docs/architecture/) for detailed architecture documentation.

---

## 🛠️ Technology Stack

### Core
- **TypeScript 5.4+** - Type-safe development
- **VSCode Extension API 1.120+** - Extension foundation
- **Node.js 20 LTS** - Runtime environment
- **Webpack 5** - Bundling and optimization

### Integrations
- **OpenAI API** - Whisper for transcription, GPT-4 for prompt transformation
- **@kstonekuan/audio-capture** - Native cross-platform microphone capture
- **VSCode SecretStorage** - Secure credential management

### Quality
- **Jest** - Unit testing
- **ESLint + Prettier** - Code quality and formatting
- **Husky** - Git hooks for pre-commit checks

---

## 📦 Installation

### From Marketplace (Coming Soon)

1. Open VSCode/Cursor
2. Go to Extensions (`Cmd+Shift+X` / `Ctrl+Shift+X`)
3. Search for "Cursor Whisper"
4. Click Install

### Manual Installation (Current)

1. Download the latest `.vsix` file from [Releases](https://github.com/your-org/cursor-whisper/releases)
2. Open VSCode/Cursor
3. Go to Extensions
4. Click "..." menu → "Install from VSIX..."
5. Select the downloaded file

---

## ⚙️ Configuration

### First-Time Setup

1. After installation, you'll be prompted to configure your OpenAI API Key
2. Click "Configure API Key"
3. Enter your API key (starts with `sk-`)
4. The extension will verify the key and save it securely

### Manual Configuration

Open Settings (`Cmd+,` / `Ctrl+,`) and search for "Cursor Whisper":

```json
{
  "cursorWhisper.transcriptionLanguage": "en",
  "cursorWhisper.enablePromptTransformation": true,
  "cursorWhisper.audioQuality": "high",
  "cursorWhisper.maxRecordingDuration": 120,
  "cursorWhisper.showNotifications": true
}
```

### Configuration Options

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `transcriptionLanguage` | string | `"en"` | Language for transcription (`en`, `es`, `fr`, `de`, `auto`) |
| `enablePromptTransformation` | boolean | `true` | Transform transcription into optimized prompts |
| `audioQuality` | string | `"high"` | Audio recording quality (`low`, `medium`, `high`) |
| `maxRecordingDuration` | number | `120` | Maximum recording duration in seconds |
| `showNotifications` | boolean | `true` | Show status notifications |

---

## 🧪 Development & Testing

### Prerequisites

- Node.js 18+ installed
- VSCode or Cursor IDE
- OpenAI API key

### Setup Development Environment

```bash
# Clone the repository
git clone https://github.com/your-org/cursor-whisper
cd cursor-whisper

# Install dependencies
npm install

# Compile TypeScript
npm run compile
```

### Debug the Extension

1. Open the project in VSCode/Cursor
2. Press `F5` to start debugging
3. A new "Extension Development Host" window will open
4. The extension will be loaded in this window

### Configure API Key

1. In the Extension Development Host window:
   - Open Command Palette (`Cmd/Ctrl+Shift+P`)
   - Type: "Cursor Whisper: Configure API Key"
   - Paste your OpenAI API key (starts with `sk-...`)
   - The key is securely stored in your system's Keychain/Credential Manager

### Test the Extension

1. **Start Recording**:
   - Press `Cmd/Ctrl+Alt+V` (or click "Voice" in the status bar)
   - Recording starts immediately in the background

2. **Record Audio**:
   - Speak clearly into your microphone
   - Ensure Cursor has microphone access in System Settings (macOS) or Privacy settings (Windows)

3. **Stop Recording**:
   - Press the stop command or status bar action when done

4. **Wait for Processing**:
   - Audio is transcribed (~5-10 seconds)
   - Text is optimized with GPT-4 (optional)
   - Text is automatically inserted into the active editor

5. **Check Status**:
   - Status bar shows current state
   - Notifications show progress and errors

### Build Status

```bash
# Compile TypeScript
npm run compile

# Run linter
npm run lint

# Run tests (when available)
npm test

# Package extension
npm run package
```

**Current Build**: ✅ SUCCESS (577 KB bundle)

---

## 🚀 Usage

### Quick Start

1. **Open your editor or Cursor chat**
2. **Press `Cmd+Alt+V` (macOS) or `Ctrl+Alt+V` (Windows/Linux)**
3. **Speak naturally about your requirements**
4. **Press the same shortcut or click the status bar to stop**
5. **Transcribed and optimized text appears automatically**

### Alternative: Status Bar Button

Click the microphone icon (🎤) in the status bar:
- **Idle state**: Click to start recording
- **Recording**: Click to stop
- **Processing**: Wait for transcription

### Example Workflow

**Spoken Input:**
> "I need to refactor the authentication service to support JWT tokens instead of sessions. We should maintain backward compatibility with existing session-based auth for 6 months. Also need unit tests for the new JWT validation logic and integration tests for the auth flow."

**Optimized Output:**
```markdown
## Refactor Authentication Service to JWT

### Context
- Current implementation: session-based authentication
- Target implementation: JWT tokens

### Objectives
1. Implement JWT token generation and validation
2. Maintain backward compatibility with session-based auth
3. Provide 6-month deprecation period for sessions

### Technical Requirements
- JWT library integration
- Token validation middleware
- Session-to-JWT migration path

### Testing Requirements
- Unit tests for JWT validation logic
- Integration tests for complete auth flow
- Backward compatibility tests for sessions

### Timeline
- 6-month deprecation period for session-based auth
```

---

## 🎨 User Experience

### Visual States

The extension provides clear visual feedback through the status bar:

| State | Icon | Description |
|-------|------|-------------|
| **Idle** | 🎤 Voice | Ready to record |
| **Recording** | 🔴 Recording... | Actively recording audio |
| **Processing** | ⏳ Transcribing... | Sending audio to Whisper API |
| **Transforming** | ⏳ Optimizing... | Enhancing prompt with GPT-4 |
| **Error** | ❌ Error | Something went wrong |

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+Alt+V` / `Ctrl+Alt+V` | Toggle recording |
| `Cmd+Shift+P` → "Cursor Whisper: Start Recording" | Start recording |
| `Cmd+Shift+P` → "Cursor Whisper: Stop Recording" | Stop recording |
| `Cmd+Shift+P` → "Cursor Whisper: Configure API Key" | Configure API key |

---

## 🔒 Security & Privacy

### Data Handling

- **Audio files are temporary** - Deleted immediately after transcription
- **No local storage** - Audio is never written to disk
- **API keys are encrypted** - Stored in VSCode SecretStorage
- **No telemetry** - Zero analytics or usage tracking
- **HTTPS only** - All API calls are encrypted

### API Key Security

Your OpenAI API key is:
1. Stored in VSCode's secure credential storage (SecretStorage)
2. Never exposed in logs or error messages
3. Never sent anywhere except OpenAI's official API
4. Accessible only by this extension

### Microphone Permissions

The extension requests microphone access:
- **macOS**: System Settings → Privacy & Security → Microphone
- **Windows**: Settings → Privacy → Microphone
- **Linux**: System-dependent, usually automatic

---

## 🏗️ Development

### Prerequisites

- **Node.js 20+**
- **npm or pnpm**
- **VSCode 1.120+** for testing

### Setup

```bash
# Clone the repository
git clone https://github.com/your-org/cursor-whisper.git
cd cursor-whisper

# Install dependencies
npm install

# Build the extension
npm run compile

# Run tests
npm test

# Watch mode for development
npm run watch
```

### Project Structure

```
cursor-whisper/
├── src/
│   ├── application/     # Use cases and ports
│   ├── domain/          # Business entities
│   ├── infrastructure/  # External integrations
│   ├── presentation/    # UI and commands
│   ├── shared/          # Utilities and constants
│   └── extension.ts     # Entry point
├── docs/                # Comprehensive documentation
├── test/                # Unit and integration tests
└── package.json
```

See [`docs/architecture/`](docs/architecture/) for detailed structure documentation.

### Running Locally

1. Open the project in VSCode
2. Press `F5` to launch Extension Development Host
3. The extension will be active in the new window
4. Test recording with `Cmd+Alt+V`

---

## 🧪 Testing

### Run Tests

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# Coverage
npm run test:coverage
```

### Test Strategy

- **Unit tests**: Pure business logic, use cases, domain entities
- **Integration tests**: Full recording → transcription → insertion flow
- **Manual testing**: Real-world scenarios with different audio inputs

See [`docs/testing/`](docs/testing/) for complete testing documentation.

---

## 📈 Roadmap

### v0.1.0 (Current - Alpha)
- ✅ Basic audio recording
- ✅ Whisper transcription
- ✅ Editor insertion
- ✅ API key configuration

### v0.2.0 (Next - Beta)
- 🔄 GPT-4 prompt transformation
- 🔄 Transformation preview
- 🔄 Custom transformation styles

### v0.3.0
- 🔄 Cursor chat integration
- 🔄 Chat Participant API
- 🔄 Context-aware insertion

### v0.4.0
- 🔄 Real-time streaming transcription
- 🔄 Recording history
- 🔄 Edit before insert

### v0.5.0
- 🔄 Multi-language auto-detection
- 🔄 Custom vocabulary
- 🔄 Technical term correction

### v1.0.0 (Stable)
- 🔄 Full production release
- 🔄 Complete documentation
- 🔄 Performance optimization
- 🔄 Extensive testing

See [`docs/roadmap/`](docs/roadmap/) for detailed roadmap.

---

## 🤝 Contributing

We welcome contributions! See [`docs/standards/coding-conventions.md`](docs/standards/coding-conventions.md) for coding standards and development workflow.

### Development Philosophy

1. **Clean Architecture** - Maintain clear layer separation
2. **Type Safety** - Strong TypeScript typing everywhere
3. **Testability** - Write testable, pure functions
4. **Documentation** - Document decisions and complex logic
5. **User Experience** - Prioritize UX over technical complexity

---

## 📝 Philosophy & Design Principles

### Core Principles

1. **Compatibility First** - Real-world compatibility over theoretical solutions
2. **User Experience** - Minimal friction, maximum productivity
3. **Maintainability** - Clean code over clever hacks
4. **Scalability** - Built to grow and evolve
5. **Privacy** - User data never leaves their control

### Why Clean Architecture?

- **Testability**: Business logic independent of frameworks
- **Flexibility**: Easy to swap implementations (e.g., different STT providers)
- **Maintainability**: Clear responsibilities and boundaries
- **Scalability**: Add features without breaking existing code

### Why Dependency Injection?

- **Testability**: Easy to mock dependencies
- **Flexibility**: Configure different implementations
- **Maintainability**: Clear dependency graph

---

## 🐛 Troubleshooting

### Microphone not working

**macOS:**
1. Go to System Settings → Privacy & Security → Microphone
2. Ensure VSCode/Cursor is enabled

**Windows:**
1. Go to Settings → Privacy → Microphone
2. Ensure VSCode/Cursor has permission

**Linux:**
- Permissions are usually automatic
- Check `pavucontrol` if using PulseAudio

### Transcription fails

- Verify your OpenAI API key is valid
- Check you have credits in your OpenAI account
- Ensure audio duration is between 0.1s and 5 minutes
- Check file size doesn't exceed 25MB

### Text not inserting

- Ensure you have an active editor or chat input focused
- Check the status bar for error messages
- Try manually pasting from clipboard (fallback behavior)

### Cursor Agents Window issues

Cursor Whisper works best in:
- **Classic Mode** (`cursor --classic`)
- **Editor Window**

The new "Agents Window" (Glass) has limited extension support. You'll see a warning if detected.

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **OpenAI** - Whisper and GPT-4 APIs
- **VSCode Team** - Excellent extension API and documentation
- **Cursor Team** - Innovation in AI-powered development

---

## 📬 Contact & Support

- **Issues**: [GitHub Issues](https://github.com/your-org/cursor-whisper/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/cursor-whisper/discussions)
- **Email**: support@cursor-whisper.dev

---

## 🔗 Links

- [Documentation](docs/)
- [Architecture Docs](docs/architecture/)
- [API Reference](docs/api/)
- [Project Progress](PROGRESS.md)
- [Roadmap](docs/roadmap/versions.md)

---

**Made with ❤️ for developers who think faster than they type**
