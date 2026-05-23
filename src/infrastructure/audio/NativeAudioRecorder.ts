import { Recorder } from '@kstonekuan/audio-capture';
import { IAudioRecorder } from '../../application/ports/IAudioRecorder';
import { AudioData } from '../../domain/value-objects/AudioData';
import { AudioFormat } from '../../domain/value-objects/AudioFormat';
import { RecordingState } from '../../domain/value-objects/RecordingState';
import { RecordingError } from '../../domain/errors/RecordingError';
import { PermissionError } from '../../domain/errors/PermissionError';
import { ILogger } from '../../application/ports/ILogger';

const SAMPLE_RATE = 16000;
const CHANNELS = 1;
const BIT_DEPTH = 16;

function encodePcmToWav(pcmData: Buffer, sampleRate: number, channels: number): Buffer {
  const byteRate = sampleRate * channels * (BIT_DEPTH / 8);
  const blockAlign = channels * (BIT_DEPTH / 8);
  const dataSize = pcmData.length;
  const headerSize = 44;
  const buffer = Buffer.alloc(headerSize + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(BIT_DEPTH, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  pcmData.copy(buffer, headerSize);

  return buffer;
}

function isPermissionError(error: Error): boolean {
  const message = error.message.toLowerCase();
  return (
    message.includes('permission') ||
    message.includes('denied') ||
    message.includes('not authorized') ||
    message.includes('access')
  );
}

export class NativeAudioRecorder implements IAudioRecorder {
  private recorder: Recorder | null = null;
  private state: RecordingState = RecordingState.IDLE;
  private stateListeners: Array<(state: RecordingState) => void> = [];
  private sampleChunks: Int16Array[] = [];
  private captureError: Error | null = null;

  constructor(private readonly logger: ILogger) {}

  async startRecording(): Promise<void> {
    if (this.state !== RecordingState.IDLE) {
      throw new RecordingError('Already recording or processing');
    }

    this.logger.info('Starting native audio recorder');
    this.sampleChunks = [];
    this.captureError = null;

    try {
      this.recorder = new Recorder();
      this.recorder.start((error, samples) => {
        if (error) {
          this.logger.error('Native audio capture error', error);
          this.captureError = error;

          if (isPermissionError(error)) {
            this.setState(RecordingState.ERROR);
          }
          return;
        }

        this.sampleChunks.push(samples);
      });

      this.setState(RecordingState.RECORDING);
      this.logger.info('Native recording started successfully');
    } catch (error) {
      this.cleanupRecorder();
      this.logger.error('Failed to start native recording', error as Error);

      if (error instanceof Error && isPermissionError(error)) {
        throw new PermissionError('Microphone permission denied');
      }

      throw new RecordingError(
        'Failed to start recording',
        error instanceof Error ? error : undefined
      );
    }
  }

  async stopRecording(): Promise<AudioData> {
    if (this.state !== RecordingState.RECORDING) {
      throw new RecordingError('No active recording to stop');
    }

    this.logger.info('Stopping native recording');
    this.setState(RecordingState.PROCESSING);

    try {
      this.cleanupRecorder();

      if (this.captureError) {
        if (isPermissionError(this.captureError)) {
          throw new PermissionError('Microphone permission denied');
        }

        throw new RecordingError(
          'Failed to capture audio',
          this.captureError
        );
      }

      const pcmBuffer = this.combineSampleChunks();

      if (pcmBuffer.length === 0) {
        throw new RecordingError('No audio data captured');
      }

      const wavBuffer = encodePcmToWav(pcmBuffer, SAMPLE_RATE, CHANNELS);
      const audioData = new AudioData(wavBuffer, AudioFormat.WAV, SAMPLE_RATE, CHANNELS);

      this.logger.info('Native audio data processed successfully', {
        size: audioData.getSizeInMB().toFixed(2) + 'MB',
        duration: audioData.getDurationInSeconds().toFixed(2) + 's',
      });

      this.sampleChunks = [];
      this.setState(RecordingState.IDLE);
      return audioData;
    } catch (error) {
      this.sampleChunks = [];
      this.setState(RecordingState.ERROR);
      throw error;
    }
  }

  cancelRecording(): void {
    this.logger.info('Cancelling native recording');
    this.cleanupRecorder();
    this.sampleChunks = [];
    this.captureError = null;
    this.setState(RecordingState.CANCELLED);

    setTimeout(() => {
      if (this.state === RecordingState.CANCELLED) {
        this.setState(RecordingState.IDLE);
      }
    }, 2000);
  }

  isRecording(): boolean {
    return this.state === RecordingState.RECORDING;
  }

  getState(): RecordingState {
    return this.state;
  }

  onStateChange(callback: (state: RecordingState) => void): void {
    this.stateListeners.push(callback);
  }

  dispose(): void {
    this.cleanupRecorder();
    this.sampleChunks = [];
    this.captureError = null;
    this.setState(RecordingState.IDLE);
  }

  private combineSampleChunks(): Buffer {
    const totalSamples = this.sampleChunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const combined = new Int16Array(totalSamples);

    let offset = 0;
    for (const chunk of this.sampleChunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }

    return Buffer.from(combined.buffer, combined.byteOffset, combined.byteLength);
  }

  private cleanupRecorder(): void {
    if (this.recorder) {
      try {
        this.recorder.stop();
      } catch (error) {
        this.logger.warn('Failed to stop native recorder cleanly', error as Error);
      }
      this.recorder = null;
    }
  }

  private setState(newState: RecordingState): void {
    this.state = newState;
    this.stateListeners.forEach(listener => listener(newState));
  }
}
