import { IAudioRecorder } from '../ports/IAudioRecorder';
import { ILogger } from '../ports/ILogger';
import { RecordingError } from '../../domain/errors/RecordingError';
import {
  RecordingSessionMode,
  setRecordingSessionMode,
} from '../../shared/services/RecordingSessionMode';

export class StartRecordingUseCase {
  constructor(
    private readonly audioRecorder: IAudioRecorder,
    private readonly logger: ILogger
  ) {}

  async execute(mode: RecordingSessionMode): Promise<void> {
    this.logger.info('Starting recording use case', { mode });

    if (this.audioRecorder.isRecording()) {
      throw new RecordingError('Already recording');
    }

    setRecordingSessionMode(mode);

    try {
      await this.audioRecorder.startRecording();
      this.logger.info('Recording started successfully', { mode });
    } catch (error) {
      setRecordingSessionMode(null);
      this.logger.error('Failed to start recording', error as Error);
      throw new RecordingError(
        'Failed to start recording',
        error instanceof Error ? error : undefined
      );
    }
  }
}
