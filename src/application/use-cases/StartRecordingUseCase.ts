import { IAudioRecorder } from '../ports/IAudioRecorder';
import { IConfigRepository } from '../ports/IConfigRepository';
import { ILogger } from '../ports/ILogger';
import { MissingApiKeyError } from '../../domain/errors/ConfigError';
import { RecordingError } from '../../domain/errors/RecordingError';

export class StartRecordingUseCase {
  constructor(
    private readonly audioRecorder: IAudioRecorder,
    private readonly configRepo: IConfigRepository,
    private readonly logger: ILogger
  ) {}

  async execute(): Promise<void> {
    this.logger.info('Starting recording use case');

    // 1. Validate configuration
    const config = await this.configRepo.getConfig();
    if (!config.apiKey) {
      throw new MissingApiKeyError();
    }

    // 2. Check if already recording
    if (this.audioRecorder.isRecording()) {
      throw new RecordingError('Already recording');
    }

    // 3. Start recording
    try {
      await this.audioRecorder.startRecording();
      this.logger.info('Recording started successfully');
    } catch (error) {
      this.logger.error('Failed to start recording', error as Error);
      throw new RecordingError(
        'Failed to start recording',
        error instanceof Error ? error : undefined
      );
    }
  }
}
