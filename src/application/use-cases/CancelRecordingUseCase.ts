import { IAudioRecorder } from '../ports/IAudioRecorder';
import { ILogger } from '../ports/ILogger';

export class CancelRecordingUseCase {
  constructor(
    private readonly audioRecorder: IAudioRecorder,
    private readonly logger: ILogger
  ) {}

  execute(): void {
    this.logger.info('Cancelling recording');

    if (this.audioRecorder.isRecording()) {
      this.audioRecorder.cancelRecording();
      this.logger.info('Recording cancelled');
    } else {
      this.logger.warn('No active recording to cancel');
    }
  }
}
