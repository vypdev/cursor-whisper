import axios from 'axios';
import OpenAI from 'openai';
import { IPromptTransformer, PromptContext } from '../../application/ports/IPromptTransformer';
import { TransformedPrompt } from '../../application/dto/TransformedPrompt';
import { ILogger } from '../../application/ports/ILogger';
import { ApiKey } from '../../domain/value-objects/ApiKey';
import {
  TransformationError,
  buildUserPrompt,
  calculateImprovements,
} from './transformationUtils';

interface OpenRouterModelsResponse {
  data?: Array<{ id: string }>;
}

export class OpenRouterPromptTransformer implements IPromptTransformer {
  static readonly BASE_URL = 'https://openrouter.ai/api/v1';
  static readonly DEFAULT_MODEL = 'openai/gpt-4o';
  static readonly APP_TITLE = 'Promptimize';

  private client: OpenAI | null = null;
  private cachedKey: string | null = null;

  constructor(
    private readonly getApiKey: () => Promise<string | undefined>,
    private readonly getModel: () => Promise<string | undefined>,
    private readonly getSystemPrompt: () => Promise<string>,
    private readonly logger: ILogger
  ) {}

  private async ensureClient(): Promise<{ client: OpenAI; model: string }> {
    const apiKeyStr = await this.getApiKey();
    if (!apiKeyStr) {
      throw new TransformationError('OpenRouter API key not configured');
    }

    const model = (await this.getModel()) || OpenRouterPromptTransformer.DEFAULT_MODEL;
    const cacheKey = `${apiKeyStr}:${model}`;

    if (this.client && this.cachedKey === cacheKey) {
      return { client: this.client, model };
    }

    const apiKey = new ApiKey(apiKeyStr);
    this.client = new OpenAI({
      apiKey: apiKey.toString(),
      baseURL: OpenRouterPromptTransformer.BASE_URL,
      defaultHeaders: {
        'HTTP-Referer': 'https://github.com/vypdev/cursor-whisper',
        'X-OpenRouter-Title': OpenRouterPromptTransformer.APP_TITLE,
      },
    });
    this.cachedKey = cacheKey;

    return { client: this.client, model };
  }

  static async listModels(apiKey: string): Promise<string[]> {
    const response = await axios.get<OpenRouterModelsResponse>(
      `${OpenRouterPromptTransformer.BASE_URL}/models`,
      {
        timeout: 10000,
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );
    return (response.data.data ?? []).map(model => model.id).sort();
  }

  async transform(transcription: string, context?: PromptContext): Promise<TransformedPrompt> {
    this.logger.info('Starting OpenRouter prompt transformation', {
      textLength: transcription.length,
      hasContext: !!context,
    });

    const { client, model } = await this.ensureClient();
    const systemPrompt = await this.getSystemPrompt();
    const userPrompt = buildUserPrompt(transcription, context);

    try {
      const startTime = Date.now();

      this.logger.debug('OpenRouter transformation request', {
        model,
        promptLength: userPrompt.length,
      });

      const response = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      });

      const duration = (Date.now() - startTime) / 1000;
      const transformedText = response.choices[0]?.message?.content?.trim() || transcription;
      const improvements = calculateImprovements(transcription, transformedText);

      this.logger.info('OpenRouter prompt transformation completed', {
        model,
        duration: duration.toFixed(2) + 's',
        originalLength: transcription.length,
        transformedLength: transformedText.length,
        improvements: improvements.length,
      });

      return {
        originalText: transcription,
        transformedText,
        improvements,
      };
    } catch (error) {
      this.logger.error('OpenRouter prompt transformation failed', error as Error);

      if (error instanceof OpenAI.APIError) {
        if (error.status === 401) {
          throw new TransformationError('Invalid OpenRouter API key', error);
        }
        if (error.status === 402) {
          throw new TransformationError('Insufficient OpenRouter credits', error);
        }
        if (error.status === 404) {
          throw new TransformationError(
            `Model '${model}' is not available on OpenRouter.`,
            error
          );
        }
        if (error.status === 429) {
          throw new TransformationError('Rate limit exceeded. Please try again later.', error);
        }
        if (error.status === 502) {
          throw new TransformationError('Upstream provider unavailable', error);
        }
      }

      throw new TransformationError(
        'Transformation failed',
        error instanceof Error ? error : undefined
      );
    }
  }
}
