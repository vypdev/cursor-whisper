import { IAudioRecorder } from '../ports/IAudioRecorder';
import { ILogger } from '../ports/ILogger';
import { RecordingError } from '../../domain/errors/RecordingError';
import { AudioData } from '../../domain/value-objects/AudioData';

export class StopRecordingUseCase {
  constructor(
    private readonly audioRecorder: IAudioRecorder,
    private readonly logger: ILogger
  ) {}

  async execute(): Promise<AudioData> {
    this.logger.info('Stopping recording use case');

    // Check if recording is active
    if (!this.audioRecorder.isRecording()) {
      throw new RecordingError('No active recording to stop');
    }

    try {
      const audioData = await this.audioRecorder.stopRecording();
      this.logger.info('Recording stopped successfully', {
        size: audioData.getSizeInMB().toFixed(2) + 'MB',
        duration: audioData.getDurationInSeconds().toFixed(2) + 's',
      });
      return audioData;
    } catch (error) {
      this.logger.error('Failed to stop recording', error as Error);
      throw new RecordingError(
        'Failed to stop recording',
        error instanceof Error ? error : undefined
      );
    }
  }
}
