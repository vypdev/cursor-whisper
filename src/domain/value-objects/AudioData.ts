import { AudioFormat } from './AudioFormat';

export class AudioData {
  constructor(
    public readonly buffer: Buffer,
    public readonly format: AudioFormat,
    public readonly sampleRate: number,
    public readonly channels: number
  ) {
    this.validate();
  }

  private validate(): void {
    if (this.buffer.length === 0) {
      throw new Error('Audio buffer cannot be empty');
    }

    if (this.sampleRate <= 0) {
      throw new Error('Sample rate must be positive');
    }

    if (this.channels < 1 || this.channels > 2) {
      throw new Error('Channels must be 1 (mono) or 2 (stereo)');
    }
  }

  getSizeInBytes(): number {
    return this.buffer.length;
  }

  getSizeInKB(): number {
    return this.getSizeInBytes() / 1024;
  }

  getSizeInMB(): number {
    return this.getSizeInKB() / 1024;
  }

  getDurationInSeconds(bitDepth: number = 16): number {
    const bytesPerSample = bitDepth / 8;
    const samplesCount = this.buffer.length / (bytesPerSample * this.channels);
    return samplesCount / this.sampleRate;
  }

  isMono(): boolean {
    return this.channels === 1;
  }

  isStereo(): boolean {
    return this.channels === 2;
  }
}
