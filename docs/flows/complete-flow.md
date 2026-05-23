# Complete Workflow Documentation

**Last Updated**: 2026-05-23

---

## Overview

This document details all workflows in Cursor Whisper with sequence diagrams and step-by-step explanations.

---

## 1. Complete Recording Flow (Happy Path)

### Sequence Diagram

```mermaid
sequenceDiagram
    actor User
    participant UI as Status Bar UI
    participant CMD as Command Handler
    participant UC1 as StartRecording<br/>UseCase
    participant UC2 as StopRecording<br/>UseCase
    participant Audio as Audio Recorder
    participant Whisper as Whisper Service
    participant GPT as Prompt Transformer
    participant Insert as Text Inserter
    participant OpenAI as OpenAI API

    User->>UI: Click Mic Button
    UI->>CMD: Execute startRecording
    CMD->>UC1: execute()
    
    UC1->>UC1: Check config (API key)
    UC1->>Audio: Check permissions
    Audio-->>UC1: Permission granted
    
    UC1->>Audio: startRecording()
    Audio->>Audio: Start MediaRecorder
    Audio-->>UC1: Recording started
    UC1-->>CMD: Success
    CMD-->>UI: Update state (RECORDING)
    UI-->>User: Show recording indicator

    Note over User,UI: User speaks for 30 seconds

    User->>UI: Click Stop Button
    UI->>CMD: Execute stopRecording
    CMD->>UC2: execute()
    
    UC2->>Audio: stopRecording()
    Audio->>Audio: Stop MediaRecorder
    Audio->>Audio: Convert to WAV
    Audio-->>UC2: AudioData
    
    UC2-->>UI: Update state (TRANSCRIBING)
    UI-->>User: Show "Transcribing..."
    
    UC2->>Whisper: transcribe(audioData)
    Whisper->>Whisper: Validate audio
    Whisper->>OpenAI: POST /audio/transcriptions
    OpenAI-->>Whisper: { text: "..." }
    Whisper-->>UC2: TranscriptionResult
    
    UC2-->>UI: Update state (TRANSFORMING)
    UI-->>User: Show "Optimizing prompt..."
    
    UC2->>GPT: transform(transcription)
    GPT->>GPT: Build system prompt
    GPT->>OpenAI: POST /chat/completions
    OpenAI-->>GPT: { content: "..." }
    GPT-->>UC2: TransformedPrompt
    
    UC2-->>UI: Update state (INSERTING)
    
    UC2->>Insert: insert(transformedText)
    Insert->>Insert: Try ChatInserter
    Insert->>Insert: Try EditorInserter
    Insert->>Insert: Insert into editor
    Insert-->>UC2: Success
    
    UC2-->>CMD: Success
    CMD-->>UI: Update state (IDLE)
    UI-->>User: Show "Prompt inserted ✓"
```

### Step-by-Step Explanation

**Phase 1: Start Recording (2-3 seconds)**

1. User clicks microphone button in status bar
2. `StartRecordingCommand` handler invoked
3. `StartRecordingUseCase.execute()` called:
   - Validates API key is configured
   - Checks microphone permission
   - Calls `audioRecorder.startRecording()`
4. `WebviewAudioRecorder`:
   - Requests `getUserMedia()` from browser
   - Creates `MediaRecorder` instance
   - Starts capturing audio chunks
5. Status bar updates to "Recording..." (red)
6. User sees visual feedback (pulse animation)

**Phase 2: Recording in Progress (0-120 seconds)**

7. Audio chunks collected every 100ms
8. User speaks naturally about requirements
9. Duration displayed in real-time
10. User can cancel at any time

**Phase 3: Stop Recording (1-2 seconds)**

11. User clicks stop button (or hotkey)
12. `StopRecordingCommand` handler invoked
13. `StopRecordingUseCase.execute()` called:
    - Calls `audioRecorder.stopRecording()`
14. `WebviewAudioRecorder`:
    - Stops MediaRecorder
    - Combines audio chunks into Blob
    - Converts to WAV format (16kHz mono)
    - Returns `AudioData` object
15. Status bar updates to "Processing..."

**Phase 4: Transcription (3-8 seconds)**

16. Status bar updates to "Transcribing..."
17. `TranscribeAudioUseCase.execute()` called:
    - Validates audio file size/duration
    - Calls `whisperService.transcribe(audioData)`
18. `OpenAIWhisperService`:
    - Converts Buffer to File object
    - Calls OpenAI Whisper API
    - Waits for response
19. Receives `TranscriptionResult` with text
20. Audio data discarded from memory

**Phase 5: Transformation (2-4 seconds)**

21. Status bar updates to "Optimizing prompt..."
22. `TransformPromptUseCase.execute()` called:
    - Checks if transformation enabled
    - Gathers context (editor language, project type)
    - Calls `promptTransformer.transform(transcription)`
23. `OpenAIPromptTransformer`:
    - Builds system prompt with instructions
    - Calls OpenAI GPT-4 API
    - Waits for structured response
24. Receives `TransformedPrompt` with optimized text

**Phase 6: Insertion (<1 second)**

25. Status bar updates to "Inserting..."
26. `InsertTextUseCase.execute()` called:
    - Tries `ChatParticipantInserter` first
    - Falls back to `EditorTextInserter`
    - Finally `FallbackTextInserter` (clipboard)
27. Text inserted into active context
28. Status bar returns to "Voice" (idle)
29. Success notification shown

**Total Time**: ~8-15 seconds for typical 30s recording

---

## 2. Error Handling Flows

### Scenario: API Key Not Configured

```mermaid
sequenceDiagram
    actor User
    participant CMD as Command Handler
    participant UC as StartRecording<br/>UseCase
    participant Config as Config Repository
    participant UI as User Interface

    User->>CMD: Start Recording
    CMD->>UC: execute()
    UC->>Config: getConfig()
    Config-->>UC: { apiKey: undefined }
    UC--xCMD: ConfigError: "API key not configured"
    CMD->>UI: Show error dialog
    UI-->>User: "API Key not configured"<br/>[Configure Now]
    User->>UI: Click "Configure Now"
    UI->>CMD: Execute configureApiKey
    CMD->>UI: Show input dialog
    User->>UI: Enter API key
    UI->>Config: Store API key
    Config-->>UI: Success
    UI-->>User: "API Key configured ✓"
```

### Scenario: Microphone Permission Denied

```mermaid
sequenceDiagram
    actor User
    participant UC as StartRecording<br/>UseCase
    participant Audio as Audio Recorder
    participant Perm as Permission Manager
    participant UI as User Interface

    User->>UC: Start Recording
    UC->>Audio: startRecording()
    Audio->>Perm: requestPermission()
    Perm->>Perm: navigator.getUserMedia()
    Perm--xAudio: NotAllowedError
    Audio--xUC: PermissionError
    UC--xUI: PermissionError
    UI-->>User: "Microphone permission denied"<br/>[Open Settings]
    
    alt User opens settings
        User->>UI: Click "Open Settings"
        UI->>UI: Open system settings
    else User cancels
        User->>UI: Dismiss
    end
```

### Scenario: Transcription Fails

```mermaid
sequenceDiagram
    actor User
    participant UC as StopRecording<br/>UseCase
    participant Whisper as Whisper Service
    participant OpenAI as OpenAI API
    participant UI as User Interface

    UC->>Whisper: transcribe(audioData)
    Whisper->>OpenAI: POST /audio/transcriptions
    OpenAI--xWhisper: 429 Rate Limit
    Whisper--xUC: TranscriptionError(429)
    UC->>UC: Retry logic (backoff)
    
    alt Retry succeeds
        UC->>Whisper: transcribe(audioData)
        Whisper->>OpenAI: POST /audio/transcriptions
        OpenAI-->>Whisper: Success
        Whisper-->>UC: TranscriptionResult
    else Retry fails
        UC--xUI: TranscriptionError
        UI-->>User: "Transcription failed"<br/>[Retry] [Cancel]
    end
```

### Scenario: Chat Input Not Available (Fallback)

```mermaid
sequenceDiagram
    actor User
    participant UC as InsertText<br/>UseCase
    participant Chat as Chat Inserter
    participant Editor as Editor Inserter
    participant Fallback as Fallback Inserter
    participant Clipboard as System Clipboard

    UC->>Chat: canInsert()
    Chat-->>UC: false (chat not open)
    
    UC->>Editor: canInsert()
    Editor-->>UC: false (no active editor)
    
    UC->>Fallback: canInsert()
    Fallback-->>UC: true (always)
    
    UC->>Fallback: insert(text)
    Fallback->>Clipboard: writeText(text)
    Clipboard-->>Fallback: Success
    Fallback-->>UC: true
    
    UC-->>User: "Prompt copied to clipboard.<br/>Paste where needed."
```

---

## 3. Alternative Flows

### Skip Transformation (Direct Transcription)

User can disable prompt transformation in settings:

```mermaid
flowchart LR
    A[Audio Recorded] --> B[Transcribe]
    B --> C{Transformation<br/>Enabled?}
    C -->|No| D[Insert Raw Text]
    C -->|Yes| E[Transform with GPT-4]
    E --> F[Insert Transformed Text]
```

### Cancel Recording Mid-Session

```mermaid
sequenceDiagram
    actor User
    participant UC as StopRecording<br/>UseCase
    participant Audio as Audio Recorder

    User->>UC: Cancel (Escape key)
    UC->>Audio: cancelRecording()
    Audio->>Audio: Stop MediaRecorder
    Audio->>Audio: Clear audio chunks
    Audio->>Audio: Release microphone
    Audio-->>UC: Cancelled
    UC-->>User: "Recording cancelled"
```

---

## 4. State Machine

### Recording State Transitions

```mermaid
stateDiagram-v2
    [*] --> IDLE
    
    IDLE --> RECORDING: Start Recording
    RECORDING --> IDLE: Cancel
    RECORDING --> PROCESSING: Stop Recording
    
    PROCESSING --> TRANSCRIBING: Audio Ready
    TRANSCRIBING --> TRANSFORMING: Transcription Complete
    TRANSFORMING --> INSERTING: Transformation Complete
    INSERTING --> COMPLETED: Insertion Complete
    
    PROCESSING --> ERROR: Processing Failed
    TRANSCRIBING --> ERROR: Transcription Failed
    TRANSFORMING --> IDLE: Transformation Failed (fallback)
    INSERTING --> ERROR: All Inserters Failed
    
    ERROR --> IDLE: Dismiss Error
    COMPLETED --> IDLE: Auto-reset
    
    note right of IDLE
        Ready for new recording
        Mic button visible
    end note
    
    note right of RECORDING
        Audio being captured
        Stop button visible
    end note
    
    note right of TRANSCRIBING
        Sending to Whisper API
        "Transcribing..." message
    end note
```

---

## 5. Integration Points

### External Service Calls

```mermaid
flowchart TB
    subgraph Extension["Cursor Whisper Extension"]
        UC[Use Cases]
        Adapters[Infrastructure Adapters]
    end
    
    subgraph OpenAI["OpenAI Services"]
        Whisper["Whisper API<br/>/audio/transcriptions"]
        GPT["GPT-4 API<br/>/chat/completions"]
    end
    
    subgraph VSCode["VSCode APIs"]
        Commands[Command Registry]
        Config[Configuration API]
        Secrets[Secret Storage]
        Editor[TextEditor API]
    end
    
    subgraph Browser["Browser APIs"]
        MediaRec[MediaRecorder]
        WebAudio[Web Audio API]
        UserMedia[getUserMedia]
    end
    
    UC --> Adapters
    Adapters --> Whisper
    Adapters --> GPT
    Adapters --> Commands
    Adapters --> Config
    Adapters --> Secrets
    Adapters --> Editor
    Adapters --> MediaRec
    Adapters --> WebAudio
    Adapters --> UserMedia
```

---

## Summary

**Key Flows**:
1. ✅ Complete recording → transcription → transformation → insertion
2. ✅ Error handling with graceful degradation
3. ✅ Multiple insertion strategies with fallbacks
4. ✅ Clear state management with visual feedback
5. ✅ Cancellation at any stage
6. ✅ Configuration-based behavior

**Flow Characteristics**:
- **Fast**: Most operations complete in seconds
- **Resilient**: Multiple fallback strategies
- **User-friendly**: Clear visual feedback at each stage
- **Flexible**: Configurable behavior

---

**Next**: See [UX Documentation](../ux/states.md) for UI details.
