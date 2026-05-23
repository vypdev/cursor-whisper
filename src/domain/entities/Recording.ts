import { AudioData } from '../value-objects/AudioData';
import { RecordingState } from '../value-objects/RecordingState';
import { InvalidRecordingError } from '../errors/RecordingError';

/**
 * Domain entity for a completed recording session.
 *
 * @remarks Not yet wired in the live pipeline — stop/transcribe flows use {@link AudioData}
 * directly. Retained for future session tracking and domain validation.
 */
export class Recording {
  private state: RecordingState;

  constructor(
    public readonly id: string,
    public readonly audioData: AudioData,
    public readonly timestamp: Date,
    public readonly duration: number
  ) {
    this.state = RecordingState.COMPLETED;
    this.validate();
  }

  private validate(): void {
    if (this.duration <= 0) {
      throw new InvalidRecordingError('Duration must be positive');
    }

    if (this.duration > 300) {
      throw new InvalidRecordingError('Duration exceeds maximum (5 minutes)');
    }

    if (this.audioData.buffer.length === 0) {
      throw new InvalidRecordingError('Audio data is empty');
    }

    const calculatedDuration = this.audioData.getDurationInSeconds();
    const durationDiff = Math.abs(calculatedDuration - this.duration);

    if (durationDiff > 1) {
      throw new InvalidRecordingError(
        `Duration mismatch: recorded ${this.duration}s, actual ${calculatedDuration}s`
      );
    }
  }

  isLongRecording(): boolean {
    return this.duration > 60;
  }

  isShortRecording(): boolean {
    return this.duration < 3;
  }

  getFileSizeInMB(): number {
    return this.audioData.getSizeInBytes() / (1024 * 1024);
  }

  exceedsSizeLimit(limitMB: number = 25): boolean {
    return this.getFileSizeInMB() > limitMB;
  }

  getState(): RecordingState {
    return this.state;
  }

  setState(newState: RecordingState): void {
    this.state = newState;
  }
}
