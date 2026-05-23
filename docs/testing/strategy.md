# Testing Strategy

**Last Updated**: 2026-05-23

---

## Overview

Cursor Whisper uses a comprehensive testing strategy to ensure quality, reliability, and maintainability.

**Testing Philosophy**: Test behavior, not implementation.

---

## Test Pyramid

```
        /\
       /  \      E2E Tests (5%)
      /    \     - Full user workflows
     /------\    - Browser + Extension + API
    /        \   
   /          \  Integration Tests (20%)
  /            \ - Layer interactions
 /              \- Real services (mocked APIs)
/________________\
Unit Tests (75%)
- Pure logic
- Isolated components
- Fast, deterministic
```

---

## 1. Unit Tests (75%)

### What to Unit Test

**Domain Layer** (100% coverage):
- ✅ Entity validation logic
- ✅ Value object behavior
- ✅ Domain services
- ✅ Business rules

**Application Layer** (95% coverage):
- ✅ Use case logic
- ✅ Error handling
- ✅ Business workflows

**Infrastructure Layer** (60% coverage):
- ✅ Adapter logic (mocked externals)
- ✅ Data transformations
- ✅ Error mapping

**Presentation Layer** (40% coverage):
- ✅ Command handlers
- ✅ State management
- ✅ UI logic (non-visual)

### Example: Domain Entity Test

```typescript
// __tests__/domain/entities/Recording.test.ts
import { Recording } from '../../../src/domain/entities/Recording';
import { AudioData } from '../../../src/domain/value-objects/AudioData';
import { AudioFormat } from '../../../src/domain/value-objects/AudioFormat';
import { InvalidRecordingError } from '../../../src/domain/errors/RecordingError';

describe('Recording Entity', () => {
  const createValidAudioData = () => {
    return new AudioData(
      Buffer.alloc(1024),
      AudioFormat.WAV,
      16000,
      1
    );
  };

  describe('construction', () => {
    it('should create valid recording', () => {
      const audioData = createValidAudioData();
      const recording = new Recording(
        'rec-123',
        audioData,
        new Date(),
        5.2
      );

      expect(recording.id).toBe('rec-123');
      expect(recording.duration).toBe(5.2);
      expect(recording.audioData).toBe(audioData);
    });

    it('should throw error for negative duration', () => {
      const audioData = createValidAudioData();
      
      expect(() => {
        new Recording('rec-123', audioData, new Date(), -5);
      }).toThrow(InvalidRecordingError);
    });

    it('should throw error for excessive duration', () => {
      const audioData = createValidAudioData();
      
      expect(() => {
        new Recording('rec-123', audioData, new Date(), 400);
      }).toThrow(InvalidRecordingError);
    });

    it('should throw error for empty audio', () => {
      const emptyAudio = new AudioData(
        Buffer.alloc(0),
        AudioFormat.WAV,
        16000,
        1
      );

      expect(() => {
        new Recording('rec-123', emptyAudio, new Date(), 5);
      }).toThrow(InvalidRecordingError);
    });
  });

  describe('business logic', () => {
    it('should identify long recordings correctly', () => {
      const audioData = createValidAudioData();
      const longRecording = new Recording('id', audioData, new Date(), 90);
      const shortRecording = new Recording('id', audioData, new Date(), 30);

      expect(longRecording.isLongRecording()).toBe(true);
      expect(shortRecording.isLongRecording()).toBe(false);
    });

    it('should calculate file size correctly', () => {
      const audioData = new AudioData(
        Buffer.alloc(1024 * 1024), // 1MB
        AudioFormat.WAV,
        16000,
        1
      );
      const recording = new Recording('id', audioData, new Date(), 5);

      expect(recording.getFileSizeInMB()).toBeCloseTo(1.0, 2);
    });

    it('should detect size limit exceeded', () => {
      const largeAudio = new AudioData(
        Buffer.alloc(30 * 1024 * 1024), // 30MB
        AudioFormat.WAV,
        16000,
        1
      );
      const recording = new Recording('id', largeAudio, new Date(), 5);

      expect(recording.exceedsSizeLimit()).toBe(true);
      expect(recording.exceedsSizeLimit(50)).toBe(false);
    });
  });
});
```

### Example: Use Case Test with Mocks

```typescript
// __tests__/application/use-cases/StartRecordingUseCase.test.ts
import { StartRecordingUseCase } from '../../../src/application/use-cases/StartRecordingUseCase';
import { IAudioRecorder } from '../../../src/application/ports/IAudioRecorder';
import { IConfigRepository } from '../../../src/application/ports/IConfigRepository';
import { ILogger } from '../../../src/application/ports/ILogger';
import { ConfigError } from '../../../src/domain/errors/ConfigError';
import { PermissionError } from '../../../src/domain/errors/PermissionError';

describe('StartRecordingUseCase', () => {
  let useCase: StartRecordingUseCase;
  let mockAudioRecorder: jest.Mocked<IAudioRecorder>;
  let mockConfigRepo: jest.Mocked<IConfigRepository>;
  let mockLogger: jest.Mocked<ILogger>;

  beforeEach(() => {
    mockAudioRecorder = {
      startRecording: jest.fn().mockResolvedValue(undefined),
      stopRecording: jest.fn(),
      cancelRecording: jest.fn(),
      isRecording: jest.fn().mockReturnValue(false),
      getState: jest.fn(),
      onStateChange: jest.fn()
    };

    mockConfigRepo = {
      getConfig: jest.fn().mockResolvedValue({
        apiKey: 'sk-test-key',
        transcriptionLanguage: 'en',
        enablePromptTransformation: true,
        audioQuality: 'high',
        maxRecordingDuration: 120,
        showNotifications: true
      }),
      updateConfig: jest.fn(),
      onConfigChange: jest.fn()
    };

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      setLevel: jest.fn()
    };

    useCase = new StartRecordingUseCase(
      mockAudioRecorder,
      mockConfigRepo,
      mockLogger
    );
  });

  describe('execute', () => {
    it('should start recording when config is valid', async () => {
      await useCase.execute();

      expect(mockConfigRepo.getConfig).toHaveBeenCalled();
      expect(mockAudioRecorder.startRecording).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Recording started successfully');
    });

    it('should throw ConfigError when API key not configured', async () => {
      mockConfigRepo.getConfig.mockResolvedValue({
        apiKey: undefined,
        transcriptionLanguage: 'en',
        enablePromptTransformation: true,
        audioQuality: 'high',
        maxRecordingDuration: 120,
        showNotifications: true
      });

      await expect(useCase.execute()).rejects.toThrow(ConfigError);
      await expect(useCase.execute()).rejects.toThrow('OpenAI API Key not configured');
      
      expect(mockAudioRecorder.startRecording).not.toHaveBeenCalled();
    });

    it('should not start recording if already recording', async () => {
      mockAudioRecorder.isRecording.mockReturnValue(true);

      await expect(useCase.execute()).rejects.toThrow('Already recording');
      
      expect(mockAudioRecorder.startRecording).not.toHaveBeenCalled();
    });

    it('should log error when recording fails', async () => {
      const recordingError = new Error('Microphone not available');
      mockAudioRecorder.startRecording.mockRejectedValue(recordingError);

      await expect(useCase.execute()).rejects.toThrow();
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to start recording',
        recordingError
      );
    });
  });
});
```

---

## 2. Integration Tests (20%)

### What to Integration Test

- ✅ Use case → Infrastructure adapter flow
- ✅ Webview ↔ Extension communication
- ✅ VSCode API integration
- ✅ OpenAI API integration (with mocks)

### Example: Integration Test

```typescript
// __tests__/integration/recording-flow.test.ts
import * as vscode from 'vscode';
import { activate } from '../../src/extension';

describe('Complete Recording Flow', () => {
  let context: vscode.ExtensionContext;

  beforeAll(async () => {
    // Activate extension
    context = {
      subscriptions: [],
      extensionPath: __dirname,
      // ... mock other context properties
    } as any;

    await activate(context);
  });

  afterAll(async () => {
    // Cleanup
    context.subscriptions.forEach(sub => sub.dispose());
  });

  it('should execute full recording workflow', async () => {
    // 1. Open a text editor
    const document = await vscode.workspace.openTextDocument({
      content: '',
      language: 'typescript'
    });
    await vscode.window.showTextDocument(document);

    // 2. Start recording
    await vscode.commands.executeCommand('cursor-whisper.startRecording');
    
    // Wait for recording state
    await sleep(100);

    // 3. Verify recording started (check state)
    // In real test, we'd mock audio and check state

    // 4. Stop recording (simulated)
    await vscode.commands.executeCommand('cursor-whisper.stopRecording');

    // 5. Wait for processing (with mocked APIs)
    await sleep(1000);

    // 6. Verify text was inserted
    const text = document.getText();
    expect(text.length).toBeGreaterThan(0);
  });

  it('should handle missing API key gracefully', async () => {
    // Clear API key
    await vscode.commands.executeCommand('cursor-whisper.clearApiKey');

    // Try to start recording
    await vscode.commands.executeCommand('cursor-whisper.startRecording');

    // Should show error notification
    // (In real test, we'd check notification was shown)
  });
});

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

---

## 3. E2E Tests (5%)

### What to E2E Test

- ✅ Critical user workflows
- ✅ Actual OpenAI API calls (in dev environment)
- ✅ Real browser audio recording
- ✅ Cross-platform behavior

### Example: E2E Test Plan

**Test Case 1: Happy Path**
1. Open VSCode/Cursor
2. Install extension
3. Configure API key
4. Open TypeScript file
5. Click mic button
6. Speak: "Create a function that sorts an array"
7. Click stop
8. Verify text appears in editor
9. Verify text is structured and optimized

**Test Case 2: Error Handling**
1. Start recording without API key
2. Verify error message shown
3. Click "Configure API Key"
4. Enter valid key
5. Retry recording
6. Verify success

**Test Case 3: Fallback Insertion**
1. Close all editors
2. Start recording
3. Stop recording
4. Verify clipboard contains text
5. Verify notification shown

---

## Test Configuration

### Jest Configuration

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/__tests__'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts'
  ],
  coverageThresholds: {
    global: {
      branches: 70,
      functions: 75,
      lines: 80,
      statements: 80
    },
    './src/domain/': {
      branches: 95,
      functions: 95,
      lines: 98,
      statements: 98
    },
    './src/application/': {
      branches: 90,
      functions: 90,
      lines: 95,
      statements: 95
    }
  },
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts']
};
```

### Test Setup

```typescript
// __tests__/setup.ts
import { TextEncoder, TextDecoder } from 'util';

// Polyfills for Node environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Mock VSCode APIs
jest.mock('vscode', () => ({
  window: {
    showInformationMessage: jest.fn(),
    showErrorMessage: jest.fn(),
    showWarningMessage: jest.fn(),
    activeTextEditor: undefined,
    createStatusBarItem: jest.fn(() => ({
      show: jest.fn(),
      hide: jest.fn(),
      dispose: jest.fn()
    }))
  },
  commands: {
    registerCommand: jest.fn(),
    executeCommand: jest.fn()
  },
  workspace: {
    getConfiguration: jest.fn(() => ({
      get: jest.fn(),
      update: jest.fn()
    }))
  },
  StatusBarAlignment: {
    Left: 1,
    Right: 2
  }
}), { virtual: true });

// Cleanup after each test
afterEach(() => {
  jest.clearAllMocks();
});
```

---

## Testing Best Practices

### DO ✅

1. **Test behavior, not implementation**
   ```typescript
   // ✅ GOOD: Test the behavior
   expect(recording.isLongRecording()).toBe(true);
   
   // ❌ BAD: Test implementation details
   expect(recording['duration']).toBeGreaterThan(60);
   ```

2. **Use descriptive test names**
   ```typescript
   // ✅ GOOD
   it('should throw InvalidRecordingError when duration is negative', () => {});
   
   // ❌ BAD
   it('test1', () => {});
   ```

3. **Arrange-Act-Assert pattern**
   ```typescript
   it('should calculate file size correctly', () => {
     // Arrange
     const audioData = createAudioData(1024 * 1024);
     const recording = new Recording('id', audioData, new Date(), 5);
     
     // Act
     const sizeInMB = recording.getFileSizeInMB();
     
     // Assert
     expect(sizeInMB).toBeCloseTo(1.0, 2);
   });
   ```

4. **One assertion per test (when possible)**
5. **Test edge cases**
6. **Mock external dependencies**
7. **Keep tests fast (<5ms per unit test)**

### DON'T ❌

1. **Don't test private methods directly**
2. **Don't make tests depend on each other**
3. **Don't use real external services in unit tests**
4. **Don't commit commented-out tests**
5. **Don't skip failing tests**

---

## Continuous Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        node-version: [20.x]
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
      
      - name: Install dependencies
        run: npm ci
      
      - name: Lint
        run: npm run lint
      
      - name: Run unit tests
        run: npm test -- --coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
      
      - name: Run integration tests
        run: npm run test:integration
```

---

## Coverage Goals

### By Layer

| Layer | Line Coverage | Branch Coverage |
|-------|--------------|----------------|
| Domain | 98%+ | 95%+ |
| Application | 95%+ | 90%+ |
| Infrastructure | 60%+ | 50%+ |
| Presentation | 40%+ | 30%+ |
| **Overall** | **80%+** | **70%+** |

---

## Manual Testing Checklist

### Before Release

- [ ] Test on macOS (Intel + Apple Silicon)
- [ ] Test on Windows 11
- [ ] Test on Linux (Ubuntu 22.04)
- [ ] Test in VSCode stable
- [ ] Test in VSCode Insiders
- [ ] Test in Cursor Classic mode
- [ ] Test in Cursor Editor Window
- [ ] Test microphone permission flow
- [ ] Test API key configuration
- [ ] Test error scenarios
- [ ] Test with poor network
- [ ] Test with rate-limited API
- [ ] Test very short recordings (<1s)
- [ ] Test long recordings (>60s)
- [ ] Test cancellation mid-recording
- [ ] Test all keyboard shortcuts
- [ ] Test accessibility (screen reader)

---

## Summary

**Testing Strategy**:
1. ✅ 75% unit tests (fast, isolated)
2. ✅ 20% integration tests (layer interactions)
3. ✅ 5% E2E tests (critical flows)
4. ✅ 80%+ overall coverage
5. ✅ Automated in CI/CD
6. ✅ Manual testing before release

**Quality Gates**:
- All tests must pass
- Coverage thresholds met
- No linter errors
- Manual checklist complete

---

**Next**: See [Deployment Documentation](../deployment/release-process.md).
