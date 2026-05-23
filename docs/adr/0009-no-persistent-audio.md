# ADR-0009: No Persistent Audio Storage

**Status**: Accepted

**Date**: 2026-05-23

**Deciders**: Core Team

**Related**: [ADR-0008](0008-secret-storage.md), Security documentation

---

## Context

After recording audio, we need to decide whether to store it temporarily or persistently.

Considerations:
- **Privacy**: Audio contains sensitive user speech
- **Storage**: Audio files can be large (5-25MB)
- **Use case**: Audio only needed for transcription
- **Debugging**: Might be useful to replay failed transcriptions
- **Disk space**: Extensions should minimize disk usage
- **User expectations**: Users expect privacy by default

Potential storage options:
1. **No storage**: Process in memory only
2. **Temporary files**: Store briefly during processing
3. **Persistent files**: Keep for history/debugging
4. **Optional storage**: Let user choose

---

## Decision

**We will NOT persistently store audio files. Audio exists only in memory during processing.**

Key principles:
- Audio captured → immediately transcribed → immediately discarded
- No audio written to disk at any point
- Temporary ArrayBuffers in memory only
- Memory cleaned up immediately after transcription
- No recording history feature (at least in MVP)
- No replay capability

### Lifecycle

```
1. User starts recording
   └─> MediaRecorder captures to memory (Blob[])

2. User stops recording
   └─> Blobs combined to single Blob
       └─> Converted to WAV (ArrayBuffer)
           └─> Sent to Whisper API
               └─> Response received
                   └─> AUDIO DATA DISCARDED ✓
```

---

## Alternatives Considered

### Alternative 1: Temporary Files During Processing
- **Description**: Write audio to temp file, delete after transcription
- **Pros**:
  - Reduces memory pressure for long recordings
  - Can retry transcription without re-recording
  - Easier to debug transcription issues
- **Cons**:
  - Audio written to disk (privacy concern)
  - File I/O overhead
  - Need to ensure cleanup (even on crash)
  - Temp files might leak
  - Disk space usage
- **Why not chosen**: Unnecessary disk write, privacy risk

### Alternative 2: Persistent Audio History
- **Description**: Keep all recordings in extension storage for history/replay
- **Pros**:
  - User can replay what they said
  - Can re-transcribe with different settings
  - Useful for debugging transcription issues
  - Feature request potential
- **Cons**:
  - **Major privacy concern**
  - Large disk space usage
  - Need retention policy and cleanup
  - User might not realize audio is stored
  - Compliance issues (GDPR, etc.)
  - Security risk if files leaked
- **Why not chosen**: Unacceptable privacy risk

### Alternative 3: Optional Storage (User Choice)
- **Description**: Let users opt-in to saving audio recordings
- **Pros**:
  - User control over privacy
  - Power users can keep history
  - Good for debugging
- **Cons**:
  - Complexity in implementation
  - Need UI for history
  - Need cleanup mechanism
  - Most users won't use it
  - Privacy risk for those who enable it
  - Increases attack surface
- **Why not chosen**: Complexity not worth it for MVP

### Alternative 4: Encrypted Persistent Storage
- **Description**: Store audio encrypted at rest
- **Pros**:
  - More secure than plain storage
  - User history possible
  - Can re-transcribe
- **Cons**:
  - Still stores audio (even if encrypted)
  - Encryption key management complexity
  - Disk space usage
  - Not truly private (extension has key)
  - Regulatory concerns remain
- **Why not chosen**: Doesn't solve core privacy concern

---

## Consequences

### Positive Consequences
- **Maximum privacy**: Audio never persists
- **Minimal disk usage**: No storage overhead
- **Simple implementation**: No file management code
- **No cleanup needed**: Memory automatically garbage collected
- **Regulatory compliance**: Easier GDPR/CCPA compliance
- **User trust**: Clear privacy guarantee
- **No temp file leaks**: Can't forget to cleanup
- **Fast**: No disk I/O during recording

### Negative Consequences
- **No replay**: Can't replay what user said
- **No re-transcription**: Must record again for retry
- **Harder debugging**: Can't inspect audio that failed transcription
- **No history feature**: Can't review past recordings
- **Memory constraints**: Long recordings use RAM

### Risks
- **Out of memory**: Very long recordings exhaust RAM
  - **Mitigation**: Hard limit on recording duration (120s default)
  - **Mitigation**: Show warning at 90s, auto-stop at 120s
  - **Likelihood**: Low (5 minutes of audio is ~5MB in memory)

- **Transcription failure**: User has to re-record
  - **Mitigation**: Show clear error message
  - **Mitigation**: Retry logic for transient API failures
  - **Mitigation**: Validate audio before sending
  - **Likelihood**: Low (Whisper API is reliable)

- **Network failure during transcription**: Audio lost
  - **Mitigation**: Could optionally save to temp file only on failure
  - **Mitigation**: Future: Offer "save for retry" option
  - **Likelihood**: Medium

### Technical Debt
- **No retry without re-recording**: Users might want replay
  - **Payoff strategy**: Future: Add opt-in temporary storage with explicit UI
  - **Timeline**: v0.4+ if users request it
  - **Effort**: 1-2 weeks to implement safely

---

## Implementation Notes

### Memory Management

```typescript
export class WebviewAudioRecorder implements IAudioRecorder {
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;

  async stopRecording(): Promise<AudioData> {
    // Collect audio data
    const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
    const wavBlob = await this.convertToWav(audioBlob);
    const arrayBuffer = await wavBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // IMPORTANT: Clean up immediately
    this.cleanup();

    return {
      buffer,
      format: AudioFormat.WAV,
      duration: this.getDuration(),
      sampleRate: 16000
    };
  }

  private cleanup(): void {
    // Stop media stream
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    // Clear audio data
    this.audioChunks = [];
    this.mediaRecorder = null;

    // Memory will be garbage collected automatically
  }
}
```

### Use Case Flow

```typescript
export class StopRecordingUseCase {
  async execute(): Promise<void> {
    try {
      // 1. Get audio data (lives in memory)
      const audioData = await this.audioRecorder.stopRecording();

      // 2. Transcribe immediately
      const transcription = await this.transcriptionService.transcribe(audioData);

      // 3. Transform prompt
      const prompt = await this.promptTransformer.transform(transcription.text);

      // 4. Insert into editor
      await this.textInserter.insert(prompt.transformedText);

      // AUDIO DATA GOES OUT OF SCOPE HERE AND IS GARBAGE COLLECTED
      // No explicit cleanup needed in TypeScript/Node.js

    } catch (error) {
      // Even on error, audio data is garbage collected
      this.logger.error('Transcription failed', error);
      throw error;
    }
  }
}
```

### Privacy Documentation

Add to `docs/security/privacy-policy.md`:

```markdown
## Audio Data Handling

### No Persistent Storage

Cursor Whisper does **NOT** store your audio recordings:

- Audio exists only in memory during processing
- Never written to disk
- Immediately discarded after transcription
- No recording history feature
- No ability to replay past recordings

### Data Flow

1. **Recording**: Audio captured to browser memory (RAM)
2. **Transcription**: Sent to OpenAI Whisper API over HTTPS
3. **Completion**: Audio data immediately deleted from memory
4. **Result**: Only text transcription remains (inserted into editor)

### What We Don't Store

- ❌ Audio files
- ❌ Recording history
- ❌ Temporary audio files
- ❌ Audio backups

### What Happens to Audio

- ✅ Sent to OpenAI Whisper API for transcription
- ✅ Processed by OpenAI (subject to their privacy policy)
- ✅ Deleted from our extension immediately after
- ✅ No traces left on your machine
```

### Future Enhancement (Optional)

```typescript
// If we add opt-in storage in future:
export class OptionalAudioStorage {
  constructor(
    private config: IConfigRepository,
    private logger: ILogger
  ) {}

  async shouldSaveOnFailure(): Promise<boolean> {
    const config = await this.config.getConfig();
    return config.saveAudioOnFailure === true;  // Default false
  }

  async saveForRetry(audio: AudioData, error: Error): Promise<string> {
    // Only if user explicitly enabled
    if (!await this.shouldSaveOnFailure()) {
      return '';
    }

    // Save to temp with timestamp
    const filename = `failed-recording-${Date.now()}.wav`;
    const tempPath = path.join(os.tmpdir(), filename);
    
    await fs.promises.writeFile(tempPath, audio.buffer);
    
    this.logger.info(`Audio saved for retry: ${tempPath}`);
    return tempPath;
  }
}
```

---

## References

- [GDPR Right to Erasure](https://gdpr-info.eu/art-17-gdpr/)
- [OWASP Data Protection Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/User_Privacy_Protection_Cheat_Sheet.html)
- [OpenAI Privacy Policy](https://openai.com/policies/privacy-policy)
