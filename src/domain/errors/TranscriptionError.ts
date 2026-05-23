export class TranscriptionError extends Error {
  constructor(message: string, public readonly statusCode?: number, public readonly cause?: Error) {
    super(message);
    this.name = 'TranscriptionError';
  }
}

export class TranscriptionTimeoutError extends TranscriptionError {
  constructor() {
    super('Transcription request timed out');
    this.name = 'TranscriptionTimeoutError';
  }
}

export class AudioTooLargeError extends TranscriptionError {
  constructor(sizeInMB: number) {
    super(`Audio file too large: ${sizeInMB.toFixed(2)}MB (max 25MB)`);
    this.name = 'AudioTooLargeError';
  }
}
