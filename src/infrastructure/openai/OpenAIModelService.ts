import OpenAI from 'openai';
import { ApiKey } from '../../domain/value-objects/ApiKey';
import { ILogger } from '../../application/ports/ILogger';

export class OpenAIModelServiceError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'OpenAIModelServiceError';
  }
}

/** Models unsuitable for chat completion prompt transformation. */
const EXCLUDED_MODEL_PATTERNS = [
  /whisper/i,
  /tts/i,
  /dall-e/i,
  /embedding/i,
  /moderation/i,
  /realtime/i,
  /audio/i,
  /transcribe/i,
  /search-preview/i,
  /instruct/i,
];

/**
 * Fetches GPT chat models available to the user's OpenAI API key.
 */
export class OpenAIModelService {
  constructor(
    private readonly getApiKey: () => Promise<string | undefined>,
    private readonly logger: ILogger
  ) {}

  async listGptModels(): Promise<string[]> {
    const apiKeyStr = await this.getApiKey();
    if (!apiKeyStr) {
      throw new OpenAIModelServiceError('OpenAI API key not configured');
    }

    const apiKey = new ApiKey(apiKeyStr);
    const client = new OpenAI({ apiKey: apiKey.toString() });

    try {
      this.logger.debug('Fetching available OpenAI models');
      const response = await client.models.list();
      const modelIds = response.data.map(model => model.id);

      const gptModels = modelIds
        .filter(id => id.startsWith('gpt-'))
        .filter(id => !EXCLUDED_MODEL_PATTERNS.some(pattern => pattern.test(id)))
        .sort((a, b) => a.localeCompare(b));

      this.logger.info('Fetched GPT models from OpenAI API', { count: gptModels.length });

      return gptModels;
    } catch (error) {
      this.logger.error('Failed to fetch OpenAI models', error as Error);

      if (error instanceof Error) {
        if (error.message.includes('invalid_api_key')) {
          throw new OpenAIModelServiceError('Invalid API key', error);
        }
      }

      throw new OpenAIModelServiceError(
        'Failed to fetch models from OpenAI',
        error instanceof Error ? error : undefined
      );
    }
  }
}
