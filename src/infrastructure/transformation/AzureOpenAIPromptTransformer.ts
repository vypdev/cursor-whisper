import OpenAI from 'openai';
import { IPromptTransformer, PromptContext } from '../../application/ports/IPromptTransformer';
import { TransformedPrompt } from '../../application/dto/TransformedPrompt';
import { ILogger } from '../../application/ports/ILogger';
import {
  TransformationError,
  buildUserPrompt,
  calculateImprovements,
} from './transformationUtils';

export interface AzureOpenAIConfig {
  endpoint: string;
  deployment: string;
}

export class AzureOpenAIPromptTransformer implements IPromptTransformer {
  private client: OpenAI | null = null;
  private cachedKey: string | null = null;

  constructor(
    private readonly getApiKey: () => Promise<string | undefined>,
    private readonly getAzureConfig: () => Promise<AzureOpenAIConfig>,
    private readonly getSystemPrompt: () => Promise<string>,
    private readonly logger: ILogger
  ) {}

  private normalizeEndpoint(endpoint: string): string {
    return endpoint.replace(/\/+$/, '');
  }

  private async ensureClient(): Promise<{ client: OpenAI; deployment: string }> {
    const apiKeyStr = await this.getApiKey();
    if (!apiKeyStr) {
      throw new TransformationError('Azure OpenAI API key not configured');
    }

    const azureConfig = await this.getAzureConfig();
    if (!azureConfig.endpoint.trim()) {
      throw new TransformationError('Azure OpenAI endpoint is not configured');
    }
    if (!azureConfig.deployment.trim()) {
      throw new TransformationError('Azure OpenAI deployment name is not configured');
    }

    const endpoint = this.normalizeEndpoint(azureConfig.endpoint);
    const deployment = azureConfig.deployment.trim();
    const cacheKey = `${apiKeyStr}:${endpoint}:${deployment}`;

    if (this.client && this.cachedKey === cacheKey) {
      return { client: this.client, deployment };
    }

    this.client = new OpenAI({
      apiKey: apiKeyStr,
      baseURL: `${endpoint}/openai/deployments/${deployment}`,
      defaultQuery: { 'api-version': '2024-02-15-preview' },
      defaultHeaders: { 'api-key': apiKeyStr },
    });
    this.cachedKey = cacheKey;

    return { client: this.client, deployment };
  }

  async transform(transcription: string, context?: PromptContext): Promise<TransformedPrompt> {
    this.logger.info('Starting Azure OpenAI prompt transformation', {
      textLength: transcription.length,
      hasContext: !!context,
    });

    const { client, deployment } = await this.ensureClient();
    const systemPrompt = await this.getSystemPrompt();
    const userPrompt = buildUserPrompt(transcription, context);

    try {
      const startTime = Date.now();

      this.logger.debug('Azure OpenAI transformation request', {
        deployment,
        promptLength: userPrompt.length,
      });

      const response = await client.chat.completions.create({
        model: deployment,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      });

      const duration = (Date.now() - startTime) / 1000;
      const transformedText = response.choices[0]?.message?.content || transcription;
      const improvements = calculateImprovements(transcription, transformedText);

      this.logger.info('Azure OpenAI prompt transformation completed', {
        deployment,
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
      this.logger.error('Azure OpenAI prompt transformation failed', error as Error);

      if (error instanceof OpenAI.APIError) {
        if (error.status === 401) {
          throw new TransformationError('Invalid Azure OpenAI API key', error);
        }
        if (error.status === 404) {
          throw new TransformationError(
            `Deployment '${deployment}' was not found. Check your Azure OpenAI configuration.`,
            error
          );
        }
        if (error.status === 429) {
          throw new TransformationError('Rate limit exceeded. Please try again later.', error);
        }
      }

      throw new TransformationError(
        'Transformation failed',
        error instanceof Error ? error : undefined
      );
    }
  }
}
