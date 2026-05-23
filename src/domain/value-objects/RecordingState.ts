export enum RecordingState {
  IDLE = 'idle',
  RECORDING = 'recording',
  PROCESSING = 'processing',
  TRANSCRIBING = 'transcribing',
  TRANSFORMING = 'transforming',
  INSERTING = 'inserting',
  COMPLETED = 'completed',
  ERROR = 'error',
  CANCELLED = 'cancelled',
}

export function isActiveState(state: RecordingState): boolean {
  return (
    state === RecordingState.RECORDING ||
    state === RecordingState.PROCESSING ||
    state === RecordingState.TRANSCRIBING ||
    state === RecordingState.TRANSFORMING ||
    state === RecordingState.INSERTING
  );
}

export function isTerminalState(state: RecordingState): boolean {
  return (
    state === RecordingState.COMPLETED ||
    state === RecordingState.ERROR ||
    state === RecordingState.CANCELLED
  );
}
