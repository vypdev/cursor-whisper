# ADR-0010: Use React for Webview UI

**Status**: Superseded by [ADR-0013](0013-native-audio-capture.md)

> **Note**: This ADR was accepted for a webview-based recording UI that was never shipped. Production uses native audio capture ([ADR-0013](0013-native-audio-capture.md)) with status bar feedback only. The referenced `src/presentation/webview/index.tsx` path was never implemented.

**Date**: 2026-05-23

**Deciders**: Core Team

**Related**: [ADR-0005](0005-webview-audio-recording.md)

---

## Context

The webview needs a UI for the recording interface. We need to decide on the UI framework/approach.

Requirements:
- **Modern UI**: Buttons, animations, state indicators
- **State management**: Recording states (idle, recording, processing)
- **Responsiveness**: Real-time feedback during recording
- **Maintainability**: Easy to modify and extend
- **Bundle size**: Keep webview lightweight
- **Team familiarity**: Prefer known technologies

UI needs:
- Microphone button with states
- Recording indicator with animation
- Progress/duration display
- Error notifications
- Settings panel (future)

---

## Decision

**We will use React 18 for the webview UI.**

Key aspects:
- React for component architecture
- Functional components with hooks
- Context API for state (no Redux)
- CSS modules for styling
- Webpack for bundling
- TypeScript for type safety

### Component Structure

```
webview/
├── components/
│   ├── MicrophoneButton.tsx
│   ├── RecordingIndicator.tsx
│   ├── StatusDisplay.tsx
│   ├── ErrorNotification.tsx
│   └── SettingsPanel.tsx
├── hooks/
│   ├── useRecordingState.ts
│   ├── useAudioRecorder.ts
│   └── useVSCodeMessage.ts
├── context/
│   └── RecordingContext.tsx
├── App.tsx
└── index.tsx
```

---

## Alternatives Considered

### Alternative 1: Vanilla JavaScript
- **Description**: Plain JavaScript with DOM manipulation
- **Pros**:
  - No framework overhead
  - Smallest bundle size
  - No build complexity
  - Fast to load
- **Cons**:
  - Manual DOM updates
  - State management complexity
  - Harder to maintain
  - More boilerplate
  - No component reusability
- **Why not chosen**: Harder to maintain as UI grows

### Alternative 2: Vue.js
- **Description**: Vue 3 with Composition API
- **Pros**:
  - Lightweight framework
  - Good TypeScript support
  - Simple to learn
  - Template-based
- **Cons**:
  - Less familiar to team
  - Smaller ecosystem than React
  - Less community in VSCode extension space
- **Why not chosen**: Team more familiar with React

### Alternative 3: Svelte
- **Description**: Svelte for webview UI
- **Pros**:
  - Smallest bundle size (compiled)
  - Very fast
  - Simple syntax
  - Great performance
- **Cons**:
  - Less familiar to team
  - Smaller ecosystem
  - Fewer VSCode extension examples
  - Experimental in some areas
- **Why not chosen**: Team expertise with React is stronger

### Alternative 4: Web Components
- **Description**: Native Web Components (Custom Elements)
- **Pros**:
  - Standards-based
  - No framework
  - Reusable across frameworks
  - Small footprint
- **Cons**:
  - Verbose API
  - Less tooling support
  - State management manual
  - Styling challenges
  - Limited template capabilities
- **Why not chosen**: Too low-level for our needs

### Alternative 5: Preact
- **Description**: Lightweight React alternative
- **Pros**:
  - Much smaller than React (~3KB)
  - React-compatible API
  - Fast
- **Cons**:
  - Missing some React features
  - Smaller ecosystem
  - Potential compatibility issues
  - Not meaningfully different from React for our use
- **Why not chosen**: React size not a concern for extension

---

## Consequences

### Positive Consequences
- **Familiar technology**: Team knows React well
- **Component architecture**: Reusable, testable components
- **Rich ecosystem**: Tons of libraries and tools
- **Great tooling**: DevTools, testing libraries
- **Type safety**: TypeScript support is excellent
- **Hooks**: Clean state management with hooks
- **Documentation**: Extensive docs and examples
- **Community**: Large community for help

### Negative Consequences
- **Bundle size**: ~130KB for React + React-DOM (minified)
- **Build complexity**: Need Webpack/bundler
- **Framework dependency**: Tied to React
- **Learning curve**: For contributors unfamiliar with React
- **Overkill potential**: Might be heavy for simple UI

### Risks
- **Bundle size**: React might be too heavy for webview
  - **Mitigation**: Minify and code-split
  - **Mitigation**: 130KB is acceptable for modern systems
  - **Likelihood**: Low (acceptable size)

- **React version changes**: Breaking changes in React updates
  - **Mitigation**: Lock to React 18 for stability
  - **Mitigation**: Only upgrade with testing
  - **Likelihood**: Low (React is mature)

- **VSCode webview limitations**: React might not work in webview
  - **Mitigation**: Many extensions successfully use React
  - **Mitigation**: Test thoroughly
  - **Likelihood**: Very low (proven pattern)

### Technical Debt
- None significant. React is well-supported and stable.

---

## Implementation Notes

### Project Setup

```json
// package.json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@babel/preset-react": "^7.22.0",
    "webpack": "^5.88.0",
    "ts-loader": "^9.4.4"
  }
}
```

### Webpack Configuration

```javascript
// webpack.config.js (webview)
module.exports = {
  entry: './src/presentation/webview/index.tsx',
  output: {
    path: path.resolve(__dirname, 'out/webview'),
    filename: 'webview.js'
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js']
  },
  mode: 'production',
  optimization: {
    minimize: true
  }
};
```

### Example Component

```typescript
// MicrophoneButton.tsx
import React from 'react';
import { useRecordingState } from '../hooks/useRecordingState';
import './MicrophoneButton.css';

interface Props {
  onToggle: () => void;
}

export const MicrophoneButton: React.FC<Props> = ({ onToggle }) => {
  const { state } = useRecordingState();

  return (
    <button
      className={`mic-button ${state}`}
      onClick={onToggle}
      disabled={state === 'processing'}
      aria-label={state === 'recording' ? 'Stop recording' : 'Start recording'}
    >
      <div className="mic-icon">
        {state === 'recording' && <div className="pulse-animation" />}
        <MicIcon />
      </div>
      {state === 'processing' && <Spinner />}
    </button>
  );
};
```

### State Management with Hooks

```typescript
// useRecordingState.ts
import { create} from 'zustand';

interface RecordingState {
  state: 'idle' | 'recording' | 'processing' | 'error';
  duration: number;
  error: string | null;
}

export const useRecordingState = create<RecordingState>((set) => ({
  state: 'idle',
  duration: 0,
  error: null,
  
  startRecording: () => set({ state: 'recording', duration: 0, error: null }),
  stopRecording: () => set({ state: 'processing' }),
  setError: (error: string) => set({ state: 'error', error }),
  reset: () => set({ state: 'idle', duration: 0, error: null })
}));
```

### VSCode Message Integration

```typescript
// useVSCodeMessage.ts
import { useEffect } from 'react';

declare const vscode: {
  postMessage: (message: any) => void;
};

export function useVSCodeMessage(handler: (message: any) => void) {
  useEffect(() => {
    const listener = (event: MessageEvent) => {
      const message = event.data;
      handler(message);
    };

    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, [handler]);
}

export function sendToExtension(command: string, data?: any) {
  vscode.postMessage({ command, data });
}
```

### App Component

```typescript
// App.tsx
import React, { useState } from 'react';
import { MicrophoneButton } from './components/MicrophoneButton';
import { RecordingIndicator } from './components/RecordingIndicator';
import { ErrorNotification } from './components/ErrorNotification';
import { useVSCodeMessage, sendToExtension } from './hooks/useVSCodeMessage';
import { useRecordingState } from './hooks/useRecordingState';

export const App: React.FC = () => {
  const { state, error, startRecording, stopRecording, setError, reset } = useRecordingState();

  useVSCodeMessage((message) => {
    switch (message.command) {
      case 'recordingStarted':
        startRecording();
        break;
      case 'recordingStopped':
        stopRecording();
        break;
      case 'error':
        setError(message.error);
        break;
      case 'success':
        reset();
        break;
    }
  });

  const handleToggle = () => {
    if (state === 'idle') {
      sendToExtension('startRecording');
    } else if (state === 'recording') {
      sendToExtension('stopRecording');
    }
  };

  return (
    <div className="app">
      <div className="recording-interface">
        <MicrophoneButton onToggle={handleToggle} />
        {state === 'recording' && <RecordingIndicator />}
        {error && <ErrorNotification message={error} onDismiss={reset} />}
      </div>
    </div>
  );
};
```

---

## References

- [React Documentation](https://react.dev/)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)
- [VSCode Webview UI Toolkit (alternative)](https://github.com/microsoft/vscode-webview-ui-toolkit)
- [React in VSCode Extensions](https://code.visualstudio.com/api/extension-guides/webview#loading-local-content)
