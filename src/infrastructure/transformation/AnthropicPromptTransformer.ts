import Anthropic from '@anthropic-ai/sdk';
import { IPromptTransformer, PromptContext } from '../../application/ports/IPromptTransformer';
import { TransformedPrompt } from '../../application/dto/TransformedPrompt';
import { ILogger } from '../../application/ports/ILogger';
import {
  TransformationError,
  TRANSFORMATION_SYSTEM_PROMPT,
  buildUserPrompt,
  calculateImprovements,
} from './transformationUtils';

export class AnthropicPromptTransformer implements IPromptTransformer {
  private client: Anthropic | null = null;
  private cachedApiKey: string | null = null;
  static readonly DEFAULT_MODEL = 'claude-3-5-sonnet-20241022';

  constructor(
    private readonly getApiKey: () => Promise<string | undefined>,
    private readonly getModel: () => Promise<string | undefined>,
    private readonly logger: ILogger
  ) {}

  private async ensureClient(): Promise<Anthropic> {
    const apiKeyStr = await this.getApiKey();
    if (!apiKeyStr) {
      throw new TransformationError('Anthropic API key not configured');
    }

    if (this.client && this.cachedApiKey === apiKeyStr) {
      return this.client;
    }

    this.client = new Anthropic({ apiKey: apiKeyStr });
    this.cachedApiKey = apiKeyStr;

    return this.client;
  }

  private async resolveModel(): Promise<string> {
    const model = await this.getModel();
    return model || AnthropicPromptTransformer.DEFAULT_MODEL;
  }

  async transform(transcription: string, context?: PromptContext): Promise<TransformedPrompt> {
    this.logger.info('Starting Anthropic prompt transformation', {
      textLength: transcription.length,
      hasContext: !!context,
    });

    const client = await this.ensureClient();
    const model = await this.resolveModel();
    const userPrompt = buildUserPrompt(transcription, context);

    try {
      const startTime = Date.now();

      this.logger.debug('Anthropic transformation request', {
        model,
        promptLength: userPrompt.length,
      });

      const response = await client.messages.create({
        model,
        max_tokens: 2000,
        system: TRANSFORMATION_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
        temperature: 0.3,
      });

      const duration = (Date.now() - startTime) / 1000;
      const textBlock = response.content.find(block => block.type === 'text');
      const transformedText =
        textBlock && textBlock.type === 'text' ? textBlock.text : transcription;
      const improvements = calculateImprovements(transcription, transformedText);

      this.logger.info('Anthropic prompt transformation completed', {
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
      this.logger.error('Anthropic prompt transformation failed', error as Error);

      if (error instanceof Anthropic.APIError) {
        if (error.status === 401) {
          throw new TransformationError('Invalid Anthropic API key', error);
        }
        if (error.status === 404) {
          throw new TransformationError(
            `Model '${model}' is not available. Choose another Anthropic model in settings.`,
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
