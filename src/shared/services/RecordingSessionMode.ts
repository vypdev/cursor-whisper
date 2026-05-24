export type RecordingSessionMode = 'transcribe' | 'promptimize';

let currentMode: RecordingSessionMode | null = null;

export function setRecordingSessionMode(mode: RecordingSessionMode | null): void {
  currentMode = mode;
}

export function getRecordingSessionMode(): RecordingSessionMode | null {
  return currentMode;
}
