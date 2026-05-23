export class RecordingError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'RecordingError';

    if (cause) {
      this.stack = `${this.stack}\nCaused by: ${cause.stack}`;
    }
  }
}

export class InvalidRecordingError extends RecordingError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidRecordingError';
  }
}

export class RecordingTimeoutError extends RecordingError {
  constructor(timeoutSeconds: number) {
    super(`Recording timeout after ${timeoutSeconds} seconds`);
    this.name = 'RecordingTimeoutError';
  }
}
