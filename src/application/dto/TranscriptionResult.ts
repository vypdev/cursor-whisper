export interface TranscriptionResult {
  /**
   * Transcribed text.
   */
  text: string;

  /**
   * Detected or specified language.
   */
  language: string;

  /**
   * Audio duration in seconds.
   */
  duration: number;

  /**
   * Confidence score (0.0 - 1.0), if available.
   */
  confidence?: number;

  /**
   * Additional metadata from transcription service.
   */
  metadata?: Record<string, unknown>;
}
