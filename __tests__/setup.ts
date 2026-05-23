import { TextEncoder, TextDecoder } from 'util';

// Polyfills for Node environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as typeof global.TextDecoder;

// Mock VSCode APIs
jest.mock('vscode', () => ({
  window: {
    showInformationMessage: jest.fn(),
    showErrorMessage: jest.fn(),
    showWarningMessage: jest.fn(),
    showInputBox: jest.fn(),
    activeTextEditor: undefined,
    createStatusBarItem: jest.fn(() => ({
      text: '',
      command: '',
      show: jest.fn(),
      hide: jest.fn(),
      dispose: jest.fn(),
    })),
    createWebviewPanel: jest.fn(),
  },
  commands: {
    registerCommand: jest.fn((_, _handler) => ({
      dispose: jest.fn(),
    })),
    executeCommand: jest.fn(),
  },
  workspace: {
    getConfiguration: jest.fn(() => ({
      get: jest.fn((_key, defaultValue) => defaultValue),
      update: jest.fn(),
      has: jest.fn(() => true),
    })),
    onDidChangeConfiguration: jest.fn(),
  },
  StatusBarAlignment: {
    Left: 1,
    Right: 2,
  },
  ViewColumn: {
    One: 1,
    Two: 2,
    Three: 3,
  },
  Uri: {
    file: jest.fn((path) => ({ fsPath: path, path })),
    parse: jest.fn((uri) => ({ fsPath: uri, path: uri })),
  },
}), { virtual: true });

// Cleanup after each test
afterEach(() => {
  jest.clearAllMocks();
});
