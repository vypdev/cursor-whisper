import { TransformationProvider } from '../../domain/value-objects/TransformationProvider';

export interface Config {
  /**
   * OpenAI API key (stored separately in SecretStorage).
   * Used for Whisper transcription and OpenAI prompt transformation.
   */
  apiKey?: string;

  /**
   * Active provider for prompt transformation.
   */
  transformationProvider: TransformationProvider;

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
   * Anthropic model ID for Claude-based transformation.
   */
  anthropicModel: string;

  /**
   * Google Gemini model ID for transformation.
   */
  googleModel: string;

  /**
   * Azure OpenAI endpoint URL.
   */
  azureEndpoint: string;

  /**
   * Azure OpenAI deployment name for the chat model.
   */
  azureDeployment: string;

  /**
   * Ollama server base URL.
   */
  ollamaBaseUrl: string;

  /**
   * Ollama model name/tag.
   */
  ollamaModel: string;

  /**
   * OpenCode LLM proxy base URL.
   */
  openCodeBaseUrl: string;

  /**
   * OpenCode model identifier (provider/model format).
   */
  openCodeModel: string;

  /**
   * OpenRouter model identifier.
   */
  openRouterModel: string;

  /**
   * Cursor model identifier for SDK-based transformation.
   */
  cursorModel: string;

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

  /**
   * System prompt used to instruct the AI during prompt transformation.
   */
  transformationSystemPrompt: string;
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
   * Get API key for a specific transformation provider.
   */
  getProviderApiKey(provider: TransformationProvider): Promise<string | undefined>;

  /**
   * Store API key for a specific transformation provider.
   */
  setProviderApiKey(provider: TransformationProvider, apiKey: string | undefined): Promise<void>;

  /**
   * Watch for configuration changes.
   *
   * @param callback Function called when config changes
   */
  onConfigChange(callback: (config: Config) => void): void;
}
