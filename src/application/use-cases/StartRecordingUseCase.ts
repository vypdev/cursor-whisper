import { IAudioRecorder } from '../ports/IAudioRecorder';
import { IConfigRepository } from '../ports/IConfigRepository';
import { ILogger } from '../ports/ILogger';
import { ITransformationProviderValidator } from '../ports/ITransformationProviderValidator';
import { InvalidConfigError, MissingApiKeyError } from '../../domain/errors/ConfigError';
import { RecordingError } from '../../domain/errors/RecordingError';
import { validateConfigurationForRecording } from '../services/ConfigurationValidationService';

export class StartRecordingUseCase {
  constructor(
    private readonly audioRecorder: IAudioRecorder,
    private readonly configRepo: IConfigRepository,
    private readonly providerValidator: ITransformationProviderValidator,
    private readonly logger: ILogger
  ) {}

  async execute(): Promise<void> {
    this.logger.info('Starting recording use case');

    const validationIssue = await validateConfigurationForRecording(
      this.configRepo,
      this.providerValidator
    );

    if (validationIssue) {
      if (validationIssue.configureCommand === 'cursor-whisper.configureApiKey') {
        throw new MissingApiKeyError();
      }

      throw new InvalidConfigError('transformationProvider', validationIssue.message);
    }

    // Check if already recording
    if (this.audioRecorder.isRecording()) {
      throw new RecordingError('Already recording');
    }

    // Start recording
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
