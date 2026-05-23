import { AudioData } from '../../domain/value-objects/AudioData';
import { TranscriptionResult } from '../dto/TranscriptionResult';

export interface TranscriptionOptions {
  /**
   * Language of the audio (ISO 639-1 code).
   * If undefined, service will auto-detect.
   */
  language?: string;

  /**
   * Optional prompt to guide transcription.
   * Useful for technical terminology.
   */
  prompt?: string;

  /**
   * Temperature for sampling (0.0 - 1.0).
   * Lower = more deterministic.
   */
  temperature?: number;
}

/**
 * Port for audio transcription functionality.
 *
 * Implementations:
 * - OpenAIWhisperService (primary): Uses OpenAI Whisper API
 * - GoogleSpeechService (future): Uses Google Cloud Speech-to-Text
 */
export interface ITranscriptionService {
  /**
   * Transcribe audio to text.
   *
   * @param audio Audio data to transcribe
   * @param options Optional transcription options
   * @returns Transcription result with text
   * @throws TranscriptionError if transcription fails
   * @throws AudioTooLargeError if audio exceeds size limit
   */
  transcribe(audio: AudioData, options?: TranscriptionOptions): Promise<TranscriptionResult>;

  /**
   * Validate audio file meets service requirements.
   *
   * @param audio Audio data to validate
   * @returns true if valid, throws error otherwise
   * @throws ValidationError if audio is invalid
   */
  validateAudioFile(audio: AudioData): boolean;
}
