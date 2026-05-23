export interface Config {
  /**
   * OpenAI API key (stored separately in SecretStorage).
   */
  apiKey?: string;

  /**
   * Language for transcription (ISO 639-1 code or 'auto').
   */
  transcriptionLanguage: string;

  /**
   * Enable prompt transformation via GPT-4.
   */
  enablePromptTransformation: boolean;

  /**
   * OpenAI model ID used for prompt transformation (default: gpt-4o).
   */
  transformationModel: string;

  /**
   * Audio recording quality ('low' | 'medium' | 'high').
   */
  audioQuality: 'low' | 'medium' | 'high';

  /**
   * Maximum recording duration in seconds.
   */
  maxRecordingDuration: number;

  /**
   * Show status notifications.
   */
  showNotifications: boolean;

  /**
   * Transcription hint for technical terms (future).
   */
  transcriptionHint?: string;
}

/**
 * Port for configuration repository.
 *
 * Implementations:
 * - VSCodeConfigRepository: Uses VSCode workspace configuration
 */
export interface IConfigRepository {
  /**
   * Get current configuration.
   *
   * @returns Current config with defaults applied
   */
  getConfig(): Promise<Config>;

  /**
   * Update configuration.
   *
   * @param config Partial config to update
   */
  updateConfig(config: Partial<Config>): Promise<void>;

  /**
   * Watch for configuration changes.
   *
   * @param callback Function called when config changes
   */
  onConfigChange(callback: (config: Config) => void): void;
}
