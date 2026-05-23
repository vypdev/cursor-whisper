import { AudioData } from '../../domain/value-objects/AudioData';
import { RecordingState } from '../../domain/value-objects/RecordingState';

/**
 * Port for audio recording functionality.
 *
 * Implementations:
 * - WebviewAudioRecorder (primary): Uses browser MediaRecorder
 * - NodeAudioRecorder (fallback): Uses Node.js libraries
 */
export interface IAudioRecorder {
  /**
   * Start recording audio from microphone.
   *
   * @throws PermissionError if microphone access denied
   * @throws RecordingError if recording fails to start
   */
  startRecording(): Promise<void>;

  /**
   * Stop recording and return audio data.
   *
   * @returns AudioData object with recorded audio
   * @throws RecordingError if no active recording
   */
  stopRecording(): Promise<AudioData>;

  /**
   * Cancel current recording without returning data.
   */
  cancelRecording(): void;

  /**
   * Check if currently recording.
   */
  isRecording(): boolean;

  /**
   * Get current recording state.
   */
  getState(): RecordingState;

  /**
   * Register callback for state changes.
   */
  onStateChange(callback: (state: RecordingState) => void): void;
}
