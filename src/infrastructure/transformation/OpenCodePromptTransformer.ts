import axios from 'axios';
import OpenAI from 'openai';
import { IPromptTransformer, PromptContext } from '../../application/ports/IPromptTransformer';
import { TransformedPrompt } from '../../application/dto/TransformedPrompt';
import { ILogger } from '../../application/ports/ILogger';
import {
  TransformationError,
  buildUserPrompt,
  calculateImprovements,
} from './transformationUtils';

export interface OpenCodeConfig {
  baseUrl: string;
  model: string;
}

interface OpenAIModelsResponse {
  data?: Array<{ id: string }>;
}

export class OpenCodePromptTransformer implements IPromptTransformer {
  static readonly DEFAULT_BASE_URL = 'http://127.0.0.1:4010/v1';

  private client: OpenAI | null = null;
  private cachedKey: string | null = null;

  constructor(
    private readonly getOpenCodeConfig: () => Promise<OpenCodeConfig>,
    private readonly getApiKey: () => Promise<string | undefined>,
    private readonly getSystemPrompt: () => Promise<string>,
    private readonly logger: ILogger
  ) {}

  private normalizeBaseUrl(baseUrl: string): string {
    return baseUrl.replace(/\/+$/, '');
  }

  static async isAvailable(baseUrl: string, apiKey?: string): Promise<boolean> {
    try {
      const normalized = baseUrl.replace(/\/+$/, '');
      const headers = apiKey?.trim() ? { Authorization: `Bearer ${apiKey.trim()}` } : undefined;
      const response = await axios.get(`${normalized}/models`, {
        timeout: 3000,
        headers,
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  static async listModels(baseUrl: string, apiKey?: string): Promise<string[]> {
    const normalized = baseUrl.replace(/\/+$/, '');
    const headers = apiKey?.trim() ? { Authorization: `Bearer ${apiKey.trim()}` } : undefined;
    const response = await axios.get<OpenAIModelsResponse>(`${normalized}/models`, {
      timeout: 5000,
      headers,
    });
    return (response.data.data ?? []).map(model => model.id).sort();
  }

  private async ensureClient(): Promise<{ client: OpenAI; model: string }> {
    const config = await this.getOpenCodeConfig();
    const baseUrl = this.normalizeBaseUrl(
      config.baseUrl || OpenCodePromptTransformer.DEFAULT_BASE_URL
    );
    const model = config.model.trim();
    if (!model) {
      throw new TransformationError('OpenCode model is not configured');
    }

    const apiKey = (await this.getApiKey())?.trim() || 'unused';
    const cacheKey = `${baseUrl}:${model}:${apiKey}`;

    if (this.client && this.cachedKey === cacheKey) {
      return { client: this.client, model };
    }

    this.client = new OpenAI({
      apiKey,
      baseURL: baseUrl,
    });
    this.cachedKey = cacheKey;

    return { client: this.client, model };
  }

  async transform(transcription: string, context?: PromptContext): Promise<TransformedPrompt> {
    this.logger.info('Starting OpenCode prompt transformation', {
      textLength: transcription.length,
      hasContext: !!context,
    });

    const { client, model } = await this.ensureClient();
    const systemPrompt = await this.getSystemPrompt();
    const userPrompt = buildUserPrompt(transcription, context);

    try {
      const startTime = Date.now();

      this.logger.debug('OpenCode transformation request', {
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

      this.logger.info('OpenCode prompt transformation completed', {
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
      this.logger.error('OpenCode prompt transformation failed', error as Error);

      if (error instanceof OpenAI.APIError) {
        if (error.status === 401) {
          throw new TransformationError('Invalid OpenCode proxy authentication token', error);
        }
        if (error.status === 404) {
          throw new TransformationError(
            `Model '${model}' was not found. Check available models via GET /v1/models on your OpenCode proxy.`,
            error
          );
        }
        if (error.status === 429) {
          throw new TransformationError('Rate limit exceeded. Please try again later.', error);
        }
      }

      if (error instanceof Error) {
        const message = error.message.toLowerCase();
        if (message.includes('econnrefused') || message.includes('connect')) {
          const config = await this.getOpenCodeConfig();
          const baseUrl = this.normalizeBaseUrl(
            config.baseUrl || OpenCodePromptTransformer.DEFAULT_BASE_URL
          );
          throw new TransformationError(
            `OpenCode server not running or not reachable at ${baseUrl}. Ensure opencode-llm-proxy is installed and running.`,
            error
          );
        }
      }

      throw new TransformationError(
        'Transformation failed',
        error instanceof Error ? error : undefined
      );
    }
  }
}
