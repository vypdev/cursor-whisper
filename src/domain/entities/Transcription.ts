import { TranscriptionError } from '../errors/TranscriptionError';

export class Transcription {
  constructor(
    public readonly id: string,
    public readonly recordingId: string,
    public readonly text: string,
    public readonly language: string,
    public readonly confidence: number | undefined,
    public readonly timestamp: Date
  ) {
    this.validate();
  }

  private validate(): void {
    if (!this.text || this.text.trim().length === 0) {
      throw new TranscriptionError('Transcription text cannot be empty');
    }

    if (this.text.length > 100000) {
      throw new TranscriptionError('Transcription text too long');
    }

    if (this.confidence !== undefined) {
      if (this.confidence < 0 || this.confidence > 1) {
        throw new TranscriptionError('Confidence must be between 0 and 1');
      }
    }
  }

  hasLowConfidence(): boolean {
    return this.confidence !== undefined && this.confidence < 0.7;
  }

  getWordCount(): number {
    return this.text.trim().split(/\s+/).length;
  }

  getCharacterCount(): number {
    return this.text.length;
  }

  isEmpty(): boolean {
    return this.text.trim().length === 0;
  }
}
