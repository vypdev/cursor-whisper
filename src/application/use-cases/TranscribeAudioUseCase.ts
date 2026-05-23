import { ITranscriptionService, TranscriptionOptions } from '../ports/ITranscriptionService';
import { IConfigRepository } from '../ports/IConfigRepository';
import { ILogger } from '../ports/ILogger';
import { AudioData } from '../../domain/value-objects/AudioData';
import { TranscriptionResult } from '../dto/TranscriptionResult';
import { Transcription } from '../../domain/entities/Transcription';
import { generateId } from '../../shared/utils/generateId';
import { AudioTooLargeError } from '../../domain/errors/TranscriptionError';

export class TranscribeAudioUseCase {
  private static readonly MAX_SIZE_MB = 25;

  constructor(
    private readonly transcriptionService: ITranscriptionService,
    private readonly configRepo: IConfigRepository,
    private readonly logger: ILogger
  ) {}

  async execute(audio: AudioData, recordingId: string): Promise<Transcription> {
    this.logger.info('Starting transcription', {
      size: audio.getSizeInMB().toFixed(2) + 'MB',
      duration: audio.getDurationInSeconds().toFixed(2) + 's',
    });

    // Validate audio size
    const sizeInMB = audio.getSizeInMB();
    if (sizeInMB > TranscribeAudioUseCase.MAX_SIZE_MB) {
      throw new AudioTooLargeError(sizeInMB);
    }

    // Validate audio file
    this.transcriptionService.validateAudioFile(audio);

    // Get configuration
    const config = await this.configRepo.getConfig();

    // Prepare options
    const options: TranscriptionOptions = {
      language: config.transcriptionLanguage === 'auto' ? undefined : config.transcriptionLanguage,
      prompt: config.transcriptionHint,
      temperature: 0, // Deterministic
    };

    try {
      // Transcribe
      const result: TranscriptionResult = await this.transcriptionService.transcribe(
        audio,
        options
      );

      this.logger.info('Transcription completed', {
        language: result.language,
        wordCount: result.text.split(/\s+/).length,
        confidence: result.confidence,
      });

      // Create domain entity
      const transcription = new Transcription(
        generateId(),
        recordingId,
        result.text,
        result.language,
        result.confidence,
        new Date()
      );

      return transcription;
    } catch (error) {
      this.logger.error('Transcription failed', error as Error);
      throw error;
    }
  }
}
