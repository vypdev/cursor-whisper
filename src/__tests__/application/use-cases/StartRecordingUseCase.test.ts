import { StartRecordingUseCase } from '../../../application/use-cases/StartRecordingUseCase';
import { IAudioRecorder } from '../../../application/ports/IAudioRecorder';
import { RecordingError } from '../../../domain/errors/RecordingError';
import { createMockLogger } from '../../helpers/mockLogger';
import {
  getRecordingSessionMode,
  setRecordingSessionMode,
} from '../../../shared/services/RecordingSessionMode';

function createMocks(options?: { isRecording?: boolean; startFails?: boolean }) {
  const audioRecorder: IAudioRecorder = {
    startRecording: jest.fn(async () => {
      if (options?.startFails) {
        throw new Error('Microphone unavailable');
      }
    }),
    stopRecording: jest.fn(),
    cancelRecording: jest.fn(),
    isRecording: jest.fn(() => options?.isRecording ?? false),
    getState: jest.fn(),
    onStateChange: jest.fn(),
  };

  return { audioRecorder };
}

describe('StartRecordingUseCase', () => {
  beforeEach(() => {
    setRecordingSessionMode(null);
  });

  it('starts recording in transcribe mode', async () => {
    const { audioRecorder } = createMocks();
    const useCase = new StartRecordingUseCase(audioRecorder, createMockLogger());

    await useCase.execute('transcribe');

    expect(audioRecorder.startRecording).toHaveBeenCalled();
    expect(getRecordingSessionMode()).toBe('transcribe');
  });

  it('starts recording in promptimize mode', async () => {
    const { audioRecorder } = createMocks();
    const useCase = new StartRecordingUseCase(audioRecorder, createMockLogger());

    await useCase.execute('promptimize');

    expect(audioRecorder.startRecording).toHaveBeenCalled();
    expect(getRecordingSessionMode()).toBe('promptimize');
  });

  it('throws RecordingError when already recording', async () => {
    const { audioRecorder } = createMocks({ isRecording: true });
    const useCase = new StartRecordingUseCase(audioRecorder, createMockLogger());

    await expect(useCase.execute('transcribe')).rejects.toThrow(RecordingError);
    expect(getRecordingSessionMode()).toBeNull();
  });

  it('clears session mode when recording fails to start', async () => {
    const { audioRecorder } = createMocks({ startFails: true });
    const useCase = new StartRecordingUseCase(audioRecorder, createMockLogger());

    await expect(useCase.execute('transcribe')).rejects.toThrow(RecordingError);
    expect(getRecordingSessionMode()).toBeNull();
  });
});
