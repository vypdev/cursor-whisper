import OpenAI from 'openai';
import { IPromptTransformer, PromptContext } from '../../application/ports/IPromptTransformer';
import { TransformedPrompt } from '../../application/dto/TransformedPrompt';
import { ILogger } from '../../application/ports/ILogger';
import { ApiKey } from '../../domain/value-objects/ApiKey';
import {
  TransformationError,
  buildOpenAIChatCompletionOptions,
  buildUserPrompt,
  calculateImprovements,
} from './transformationUtils';

export class OpenAIPromptTransformer implements IPromptTransformer {
  private client: OpenAI | null = null;
  private cachedApiKey: string | null = null;
  static readonly DEFAULT_MODEL = 'gpt-4o';

  constructor(
    private readonly getApiKey: () => Promise<string | undefined>,
    private readonly getModel: () => Promise<string | undefined>,
    private readonly getSystemPrompt: () => Promise<string>,
    private readonly logger: ILogger
  ) {}

  private async ensureClient(): Promise<OpenAI> {
    const apiKeyStr = await this.getApiKey();
    if (!apiKeyStr) {
      throw new TransformationError('OpenAI API key not configured');
    }

    if (this.client && this.cachedApiKey === apiKeyStr) {
      return this.client;
    }

    const apiKey = new ApiKey(apiKeyStr);
    this.client = new OpenAI({
      apiKey: apiKey.toString(),
    });
    this.cachedApiKey = apiKeyStr;

    return this.client;
  }

  private async resolveModel(): Promise<string> {
    const model = await this.getModel();
    return model || OpenAIPromptTransformer.DEFAULT_MODEL;
  }

  async transform(transcription: string, context?: PromptContext): Promise<TransformedPrompt> {
    this.logger.info('Starting OpenAI prompt transformation', {
      textLength: transcription.length,
      hasContext: !!context,
    });

    const client = await this.ensureClient();
    const model = await this.resolveModel();
    const systemPrompt = await this.getSystemPrompt();
    const userPrompt = buildUserPrompt(transcription, context);

    try {
      const startTime = Date.now();

      this.logger.debug('OpenAI transformation request', {
        model,
        temperature: 0.3,
        promptLength: userPrompt.length,
      });

      const response = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        ...buildOpenAIChatCompletionOptions(model),
      });

      const duration = (Date.now() - startTime) / 1000;
      const transformedText = response.choices[0]?.message?.content || transcription;
      const improvements = calculateImprovements(transcription, transformedText);

      this.logger.info('OpenAI prompt transformation completed', {
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
      this.logger.error('OpenAI prompt transformation failed', error as Error);

      if (error instanceof OpenAI.APIError) {
        if (error.status === 404 || error.code === 'model_not_found') {
          throw new TransformationError(
            `Model '${model}' is not available for your API key. Use "Promptimize: Configure Model" to choose another model.`,
            error
          );
        }
      }

      if (error instanceof Error) {
        if (error.message.includes('rate_limit')) {
          throw new TransformationError('Rate limit exceeded. Please try again later.', error);
        }

        if (error.message.includes('invalid_api_key')) {
          throw new TransformationError('Invalid API key', error);
        }
      }

      throw new TransformationError(
        'Transformation failed',
        error instanceof Error ? error : undefined
      );
    }
  }
}
