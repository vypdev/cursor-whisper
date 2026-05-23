# ADR-0008: Use VSCode SecretStorage for API Keys

**Status**: Accepted

**Date**: 2026-05-23

**Deciders**: Core Team

**Related**: [ADR-0003](0003-openai-whisper.md), Security documentation

---

## Context

Users need to provide an OpenAI API key for Whisper and GPT-4 services. API keys are sensitive credentials that must be stored securely.

Requirements:
- **Security**: Keys must be encrypted at rest
- **Privacy**: Keys never exposed in logs or UI
- **Platform support**: Must work on macOS, Windows, Linux
- **User experience**: Easy to configure
- **VSCode integration**: Native to VSCode/Cursor
- **No external dependencies**: Don't require additional services

Storage location options:
- **Plain text config**: Insecure, visible in settings.json
- **Environment variables**: Inconvenient, not persistent across sessions
- **Custom encryption**: Complex, error-prone
- **Keychain/Credential Manager**: Platform-specific, complex integration
- **VSCode SecretStorage**: Built-in, encrypted, cross-platform

---

## Decision

**We will use VSCode's built-in SecretStorage API for storing API keys.**

Key aspects:
- Use `context.secrets.store()` to save keys
- Use `context.secrets.get()` to retrieve keys
- Keys stored in platform-specific secure storage:
  - **macOS**: Keychain
  - **Windows**: Credential Manager
  - **Linux**: Secret Service API (gnome-keyring, kwallet)
- Never store keys in `settings.json` or other plain text
- Never log or display keys (mask in UI)
- Validate key format before storing

### API Usage

```typescript
export class SecretStorage {
  private static readonly API_KEY_KEY = 'cursor-whisper.openai.apiKey';

  constructor(private context: vscode.ExtensionContext) {}

  async getApiKey(): Promise<string | undefined> {
    return await this.context.secrets.get(SecretStorage.API_KEY_KEY);
  }

  async setApiKey(apiKey: string): Promise<void> {
    await this.context.secrets.store(SecretStorage.API_KEY_KEY, apiKey);
  }

  async deleteApiKey(): Promise<void> {
    await this.context.secrets.delete(SecretStorage.API_KEY_KEY);
  }

  async hasApiKey(): Promise<boolean> {
    const key = await this.getApiKey();
    return !!key && key.length > 0;
  }
}
```

---

## Alternatives Considered

### Alternative 1: Plain Text in settings.json
- **Description**: Store API key in VSCode settings
- **Pros**:
  - Simple to implement
  - Easy for users to edit
  - Visible in settings UI
  - No encryption overhead
- **Cons**:
  - **SECURITY RISK**: Key visible in plain text
  - Synced to GitHub if settings synced
  - Visible in backups
  - Easy to accidentally share
  - Violates security best practices
- **Why not chosen**: Unacceptably insecure

### Alternative 2: Environment Variables
- **Description**: Read API key from `OPENAI_API_KEY` environment variable
- **Pros**:
  - Common practice for CLI tools
  - No storage needed
  - Easy to rotate keys
- **Cons**:
  - Inconvenient for GUI users
  - Not persistent across VSCode restarts
  - Different setup per OS
  - Process environment might be logged
  - Poor UX for non-technical users
- **Why not chosen**: Poor user experience for desktop app

### Alternative 3: Custom File with Encryption
- **Description**: Store encrypted API key in extension global storage
- **Pros**:
  - Full control over encryption
  - Cross-platform
  - No external dependencies
- **Cons**:
  - Need to manage encryption keys
  - Key derivation complexity
  - Potential vulnerabilities
  - Reinventing the wheel
  - Audit/compliance issues
- **Why not chosen**: Unnecessary complexity, security risk

### Alternative 4: Platform-Specific Keychains
- **Description**: Directly use macOS Keychain, Windows Credential Manager, etc.
- **Pros**:
  - Native platform integration
  - Maximum security
  - OS-managed
- **Cons**:
  - Requires platform-specific code
  - Complex to implement and test
  - Maintenance burden
  - VSCode already provides this via SecretStorage
- **Why not chosen**: VSCode SecretStorage does this for us

### Alternative 5: OAuth Flow
- **Description**: Use OAuth to get tokens without storing API key
- **Pros**:
  - No long-lived credentials
  - Token refresh
  - Revocable
- **Cons**:
  - OpenAI doesn't support OAuth for Whisper/GPT-4
  - Complex implementation
  - Requires web server
  - Poor UX
- **Why not chosen**: Not supported by OpenAI API

---

## Consequences

### Positive Consequences
- **Secure by default**: Keys encrypted at rest by OS
- **Platform-native**: Uses OS credential storage
- **Zero configuration**: Works out of the box on all platforms
- **Simple API**: Easy to use VSCode API
- **No dependencies**: Built into VSCode
- **Sync safe**: Keys not synced with settings sync
- **Standard practice**: Recommended by VSCode team
- **Auditable**: Leverages OS security infrastructure

### Negative Consequences
- **Black box**: Don't control encryption implementation
- **OS dependency**: Relies on platform keychain
- **Migration difficulty**: Hard to bulk export/import keys
- **Debugging challenges**: Can't easily inspect stored keys
- **Headless environments**: May not work in some CI/CD contexts

### Risks
- **SecretStorage API changes**: VSCode might change API
  - **Mitigation**: VSCode has strong backward compatibility
  - **Mitigation**: Abstract behind our SecretStorage class
  - **Likelihood**: Low

- **Platform keychain issues**: OS keychain might be misconfigured
  - **Mitigation**: Show clear error message
  - **Mitigation**: Provide troubleshooting docs
  - **Likelihood**: Medium (Linux can have issues)

- **Lost keys**: User loses access to keychain
  - **Mitigation**: Easy to re-enter API key
  - **Mitigation**: Docs explain how to configure
  - **Likelihood**: Low

### Technical Debt
- None. SecretStorage is the recommended approach.

---

## Implementation Notes

### Configuration Flow

```typescript
export class SetupWizard {
  constructor(private secretStorage: SecretStorage) {}

  async run(): Promise<void> {
    if (await this.secretStorage.hasApiKey()) {
      return;  // Already configured
    }

    // Show input box
    const apiKey = await vscode.window.showInputBox({
      prompt: 'Enter your OpenAI API Key',
      password: true,  // Masked input
      placeHolder: 'sk-...',
      validateInput: (value) => {
        if (!value || !value.startsWith('sk-')) {
          return 'API key must start with sk-';
        }
        if (value.length < 20) {
          return 'API key seems too short';
        }
        return null;  // Valid
      }
    });

    if (apiKey) {
      await this.secretStorage.setApiKey(apiKey);
      vscode.window.showInformationMessage('API key saved securely');
    }
  }
}
```

### Secure API Key Usage

```typescript
export class OpenAIWhisperService implements ITranscriptionService {
  private client: OpenAI;

  constructor(
    private secretStorage: SecretStorage,
    private logger: ILogger
  ) {
    this.initializeClient();
  }

  private async initializeClient(): Promise<void> {
    const apiKey = await this.secretStorage.getApiKey();
    
    if (!apiKey) {
      throw new ConfigError('API key not configured');
    }

    this.client = new OpenAI({ 
      apiKey,
      // NEVER log the API key
      dangerouslyAllowBrowser: false
    });
  }

  async transcribe(audio: AudioData): Promise<TranscriptionResult> {
    try {
      const result = await this.client.audio.transcriptions.create({
        file: this.bufferToFile(audio),
        model: 'whisper-1'
      });
      return { text: result.text, /* ... */ };
    } catch (error) {
      if (error instanceof OpenAI.APIError && error.status === 401) {
        // Invalid API key - don't log the key itself
        this.logger.error('Invalid API key');
        throw new AuthenticationError('Invalid API key. Please reconfigure.');
      }
      throw error;
    }
  }
}
```

### Error Handling

```typescript
// If SecretStorage fails (rare)
try {
  await secretStorage.setApiKey(apiKey);
} catch (error) {
  this.logger.error('Failed to store API key', error);
  
  vscode.window.showErrorMessage(
    'Failed to save API key securely. ' +
    'Check your system keychain settings.',
    'Troubleshooting'
  ).then(selection => {
    if (selection === 'Troubleshooting') {
      vscode.env.openExternal(vscode.Uri.parse(
        'https://docs.cursor-whisper.dev/troubleshooting/api-key-storage'
      ));
    }
  });
}
```

### Key Validation

```typescript
export function validateApiKey(key: string): { valid: boolean; error?: string } {
  if (!key || key.trim().length === 0) {
    return { valid: false, error: 'API key cannot be empty' };
  }

  if (!key.startsWith('sk-')) {
    return { valid: false, error: 'API key must start with sk-' };
  }

  if (key.length < 20) {
    return { valid: false, error: 'API key seems too short' };
  }

  // Don't validate format too strictly - OpenAI might change it
  return { valid: true };
}
```

---

## References

- [VSCode SecretStorage API](https://code.visualstudio.com/api/references/vscode-api#SecretStorage)
- [VSCode Extension Secrets Guide](https://code.visualstudio.com/api/references/vscode-api#secrets)
- [OWASP Credential Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Credential_Storage_Cheat_Sheet.html)
