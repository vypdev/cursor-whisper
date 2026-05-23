import OpenAI from 'openai';
import {
  ITranscriptionService,
  TranscriptionOptions,
} from '../../application/ports/ITranscriptionService';
import { AudioData } from '../../domain/value-objects/AudioData';
import { TranscriptionResult } from '../../application/dto/TranscriptionResult';
import { ILogger } from '../../application/ports/ILogger';
import { TranscriptionError, AudioTooLargeError } from '../../domain/errors/TranscriptionError';
import { ApiKey } from '../../domain/value-objects/ApiKey';

export class OpenAIWhisperService implements ITranscriptionService {
  private client: OpenAI | null = null;
  private static readonly MAX_SIZE_MB = 25;

  constructor(
    private readonly getApiKey: () => Promise<string | undefined>,
    private readonly logger: ILogger
  ) {}

  private async ensureClient(): Promise<OpenAI> {
    if (!this.client) {
      const apiKeyStr = await this.getApiKey();
      if (!apiKeyStr) {
        throw new TranscriptionError('OpenAI API key not configured');
      }

      const apiKey = new ApiKey(apiKeyStr);
      this.client = new OpenAI({
        apiKey: apiKey.toString(),
      });
    }

    return this.client;
  }

  async transcribe(audio: AudioData, options?: TranscriptionOptions): Promise<TranscriptionResult> {
    this.logger.info('Starting Whisper transcription', {
      size: audio.getSizeInMB().toFixed(2) + 'MB',
      format: audio.format,
      language: options?.language || 'auto',
    });

    // Validate audio
    this.validateAudioFile(audio);

    const client = await this.ensureClient();

    try {
      // Convert Buffer to File object
      const blob = new Blob([audio.buffer], {
        type: `audio/${audio.format}`,
      });
      const file = new File([blob], `recording.${audio.format}`, {
        type: `audio/${audio.format}`,
      });

      // Call Whisper API
      const startTime = Date.now();
      const response = await client.audio.transcriptions.create({
        file,
        model: 'whisper-1',
        language: options?.language,
        prompt: options?.prompt,
        temperature: options?.temperature ?? 0,
        response_format: 'json',
      });

      const duration = (Date.now() - startTime) / 1000;

      this.logger.info('Whisper transcription completed', {
        duration: duration.toFixed(2) + 's',
        textLength: response.text.length,
      });

      return {
        text: response.text,
        language: options?.language || 'en',
        duration: audio.getDurationInSeconds(),
        confidence: undefined, // Whisper doesn't provide confidence in standard JSON mode
      };
    } catch (error) {
      this.logger.error('Whisper transcription failed', error as Error);

      if (error instanceof Error) {
        // Parse OpenAI API errors
        if (error.message.includes('rate_limit')) {
          throw new TranscriptionError('Rate limit exceeded. Please try again later.', 429, error);
        }

        if (error.message.includes('invalid_api_key')) {
          throw new TranscriptionError('Invalid API key', 401, error);
        }

        if (error.message.includes('timeout')) {
          throw new TranscriptionError('Transcription request timed out', 408, error);
        }
      }

      throw new TranscriptionError(
        'Transcription failed',
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }

  validateAudioFile(audio: AudioData): boolean {
    // Check size
    const sizeInMB = audio.getSizeInMB();
    if (sizeInMB > OpenAIWhisperService.MAX_SIZE_MB) {
      throw new AudioTooLargeError(sizeInMB);
    }

    // Check duration (minimum 0.1 seconds)
    const duration = audio.getDurationInSeconds();
    if (duration < 0.1) {
      throw new TranscriptionError('Audio duration too short (minimum 0.1s)');
    }

    // Check if buffer is not empty
    if (audio.buffer.length === 0) {
      throw new TranscriptionError('Audio buffer is empty');
    }

    return true;
  }
}
