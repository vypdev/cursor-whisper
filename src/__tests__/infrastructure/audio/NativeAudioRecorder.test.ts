import { NativeAudioRecorder } from '../../../infrastructure/audio/NativeAudioRecorder';
import { RecordingError } from '../../../domain/errors/RecordingError';
import { createMockLogger } from '../../helpers/mockLogger';

describe('NativeAudioRecorder', () => {
  it('returns a rejected promise when stopRecording is called without an active recording', async () => {
    const recorder = new NativeAudioRecorder(createMockLogger());

    await expect(recorder.stopRecording()).rejects.toBeInstanceOf(RecordingError);
  });

  it('does not throw synchronously when stopRecording is called without an active recording', () => {
    const recorder = new NativeAudioRecorder(createMockLogger());

    expect(() => {
      void recorder.stopRecording().catch(() => undefined);
    }).not.toThrow();
  });
});
