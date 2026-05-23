# ADR-0012: Use Mono Audio at 16kHz Sample Rate

**Status**: Accepted

**Date**: 2026-05-23

**Deciders**: Core Team

**Related**: [ADR-0003](0003-openai-whisper.md), [ADR-0005](0005-webview-audio-recording.md)

---

## Context

We need to decide on audio recording parameters. Key considerations:

**Sample Rate Options**:
- 8kHz - Telephone quality
- 16kHz - Speech quality (narrowband)
- 44.1kHz - CD quality
- 48kHz - Professional audio

**Channel Options**:
- Mono (1 channel)
- Stereo (2 channels)

**Trade-offs**:
- **Quality vs Size**: Higher quality = larger files
- **Latency**: Larger files take longer to upload/process
- **Cost**: Whisper charges per minute, not file size
- **Accuracy**: Does higher quality improve transcription?

Our use case:
- Human speech only (not music)
- Single speaker (user)
- Technical content
- Whisper API as transcription service

---

## Decision

**We will record in mono at 16kHz sample rate.**

Key aspects:
- **Mono (1 channel)**: Single microphone input
- **16kHz sample rate**: Nyquist theorem covers human speech (20Hz-8kHz)
- **16-bit depth**: Standard for speech
- **WAV format**: Uncompressed, compatible with Whisper
- **Audio enhancements enabled**:
  - Echo cancellation: true
  - Noise suppression: true
  - Auto gain control: true

### MediaRecorder Configuration

```typescript
const stream = await navigator.mediaDevices.getUserMedia({
  audio: {
    channelCount: 1,           // Mono
    sampleRate: 16000,         // 16kHz
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  }
});
```

---

## Alternatives Considered

### Alternative 1: 44.1kHz Stereo (CD Quality)
- **Description**: High-quality audio recording
- **Pros**:
  - Maximum quality
  - Captures all frequencies
  - Future-proof
- **Cons**:
  - ~5.5x larger files (2 channels × 2.75x sample rate)
  - Longer upload times
  - No accuracy improvement for speech
  - Wastes bandwidth
  - Whisper downsamples anyway
- **Why not chosen**: Overkill for speech, no transcription benefit

### Alternative 2: 8kHz Mono (Telephone Quality)
- **Description**: Minimal quality for speech
- **Pros**:
  - Smallest file size
  - Fastest upload
  - Sufficient for simple speech
- **Cons**:
  - Poor frequency response
  - Technical terms might be unclear
  - Lower transcription accuracy
  - Sounds bad to user
- **Why not chosen**: Too low quality, affects accuracy

### Alternative 3: 48kHz Mono (Professional Quality)
- **Description**: Professional audio standard
- **Pros**:
  - Excellent quality
  - Common professional standard
  - Better frequency response
- **Cons**:
  - 3x larger than 16kHz
  - No meaningful transcription improvement
  - Slower upload
  - Whisper doesn't benefit
- **Why not chosen**: Unnecessary quality for speech transcription

### Alternative 4: Stereo at 16kHz
- **Description**: 16kHz sample rate but stereo
- **Pros**:
  - Spatial information
  - Good quality
  - Might help with noise
- **Cons**:
  - 2x file size
  - Single speaker doesn't need stereo
  - Whisper converts to mono anyway
  - Wastes bandwidth
- **Why not chosen**: No benefit for single speaker

### Alternative 5: Adaptive Quality
- **Description**: Start high, reduce if needed
- **Pros**:
  - Optimal for each situation
  - Best quality when possible
- **Cons**:
  - Complex implementation
  - Inconsistent user experience
  - Hard to test all scenarios
  - Over-engineering
- **Why not chosen**: Unnecessary complexity

---

## Consequences

### Positive Consequences
- **Optimal for speech**: 16kHz covers all human speech frequencies
- **Small file size**: ~960KB per minute (16bit × 16kHz × 60s)
- **Fast upload**: Smaller files upload quickly
- **Good accuracy**: Whisper performs well at 16kHz
- **Reduced bandwidth**: Lower data usage for users
- **Standard practice**: Industry standard for speech
- **Audio enhancements**: Noise suppression improves quality

### Negative Consequences
- **Not hi-fi**: Won't sound great for playback (but we don't store audio)
- **Limited frequency range**: Max 8kHz frequency (fine for speech)
- **Can't capture nuances**: Very subtle sounds might be lost
- **No stereo**: Can't use spatial audio features (not needed)

### Risks
- **Insufficient for technical terms**: Complex terminology unclear
  - **Mitigation**: 16kHz is sufficient for consonants/vowels
  - **Mitigation**: Noise suppression helps clarity
  - **Mitigation**: Users can provide context hints
  - **Likelihood**: Low (16kHz is proven for speech)

- **Background noise**: Poor audio in noisy environments
  - **Mitigation**: Noise suppression enabled
  - **Mitigation**: Echo cancellation enabled
  - **Mitigation**: Users naturally speak clearly
  - **Likelihood**: Medium (mitigated by enhancements)

- **Whisper requires higher quality**: API changes requirements
  - **Mitigation**: Easy to change sample rate in config
  - **Mitigation**: Whisper is designed for varied quality
  - **Likelihood**: Very low (Whisper handles wide range)

### Technical Debt
- None. 16kHz mono is appropriate for the use case.
- Easy to change if requirements change.

---

## Implementation Notes

### MediaRecorder Setup

```typescript
export class WebviewAudioRecorder implements IAudioRecorder {
  async startRecording(): Promise<void> {
    // Request microphone with specific constraints
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        // Core settings
        channelCount: 1,        // Mono
        sampleRate: 16000,      // 16kHz
        
        // Audio enhancements
        echoCancellation: true,       // Remove echo/feedback
        noiseSuppression: true,       // Remove background noise
        autoGainControl: true,        // Normalize volume
        
        // Optional (browser-dependent)
        sampleSize: 16,               // 16-bit depth
        latency: 0.01                 // Low latency (10ms)
      }
    });

    // Create MediaRecorder
    const mimeType = this.getSupportedMimeType();
    this.mediaRecorder = new MediaRecorder(this.stream, {
      mimeType,
      audioBitsPerSecond: 128000  // 128 kbps (high quality for speech)
    });

    this.mediaRecorder.start(100);  // Collect chunks every 100ms
  }
}
```

### WAV Conversion

```typescript
private audioBufferToWav(audioBuffer: AudioBuffer): ArrayBuffer {
  const numberOfChannels = 1;     // Force mono
  const sampleRate = 16000;       // Force 16kHz
  const bitDepth = 16;            // 16-bit samples

  // Get channel data (mono)
  const channelData = audioBuffer.getChannelData(0);
  
  // If stereo, mix down to mono
  if (audioBuffer.numberOfChannels > 1) {
    const channel2 = audioBuffer.getChannelData(1);
    for (let i = 0; i < channelData.length; i++) {
      channelData[i] = (channelData[i] + channel2[i]) / 2;
    }
  }

  // Resample to 16kHz if needed
  const resampledData = this.resample(channelData, audioBuffer.sampleRate, 16000);

  // Convert to 16-bit PCM
  const samples = new Int16Array(resampledData.length);
  for (let i = 0; i < resampledData.length; i++) {
    const s = Math.max(-1, Math.min(1, resampledData[i]));
    samples[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }

  // Write WAV header + data
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  // WAV header (44 bytes)
  this.writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  this.writeString(view, 8, 'WAVE');
  this.writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);                    // Format chunk size
  view.setUint16(20, 1, true);                     // PCM format
  view.setUint16(22, numberOfChannels, true);      // Mono
  view.setUint32(24, sampleRate, true);            // 16kHz
  view.setUint32(28, sampleRate * 2, true);        // Byte rate
  view.setUint16(32, 2, true);                     // Block align
  view.setUint16(34, bitDepth, true);              // 16-bit
  this.writeString(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true);

  // Write PCM samples
  const offset = 44;
  for (let i = 0; i < samples.length; i++) {
    view.setInt16(offset + i * 2, samples[i], true);
  }

  return buffer;
}
```

### File Size Calculations

**Mono 16kHz 16-bit WAV**:
```
Bytes per second = 16000 samples/s × 2 bytes/sample × 1 channel
                 = 32,000 bytes/s
                 = ~31.25 KB/s

Bytes per minute = 32,000 × 60 = 1,920,000 bytes
                 ≈ 1.83 MB/minute

Maximum (120s) = 3.66 MB
```

**Comparison**:
- 16kHz mono: 1.83 MB/min
- 44.1kHz stereo: 10.1 MB/min (5.5x larger)
- 48kHz stereo: 11.0 MB/min (6.0x larger)

### Quality Verification

```typescript
// Verify audio meets requirements
export function validateAudioQuality(audioData: AudioData): boolean {
  if (audioData.sampleRate !== 16000) {
    console.warn(`Expected 16kHz, got ${audioData.sampleRate}Hz`);
  }

  if (audioData.channels !== 1) {
    console.warn(`Expected mono, got ${audioData.channels} channels`);
  }

  // Both are acceptable, but log for monitoring
  return true;
}
```

---

## References

- [Nyquist-Shannon Sampling Theorem](https://en.wikipedia.org/wiki/Nyquist%E2%80%93Shannon_sampling_theorem)
- [Human Speech Frequency Range](https://en.wikipedia.org/wiki/Voice_frequency)
- [OpenAI Whisper Audio Requirements](https://platform.openai.com/docs/guides/speech-to-text)
- [MDN getUserMedia Constraints](https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints#audio_2)
