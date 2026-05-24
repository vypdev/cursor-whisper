import { GoogleGenerativeAI } from '@google/generative-ai';
import { IPromptTransformer, PromptContext } from '../../application/ports/IPromptTransformer';
import { TransformedPrompt } from '../../application/dto/TransformedPrompt';
import { ILogger } from '../../application/ports/ILogger';
import {
  TransformationError,
  buildUserPrompt,
  calculateImprovements,
} from './transformationUtils';

export class GooglePromptTransformer implements IPromptTransformer {
  private client: GoogleGenerativeAI | null = null;
  private cachedApiKey: string | null = null;
  static readonly DEFAULT_MODEL = 'gemini-1.5-pro';

  constructor(
    private readonly getApiKey: () => Promise<string | undefined>,
    private readonly getModel: () => Promise<string | undefined>,
    private readonly getSystemPrompt: () => Promise<string>,
    private readonly logger: ILogger
  ) {}

  private async ensureClient(): Promise<GoogleGenerativeAI> {
    const apiKeyStr = await this.getApiKey();
    if (!apiKeyStr) {
      throw new TransformationError('Google API key not configured');
    }

    if (this.client && this.cachedApiKey === apiKeyStr) {
      return this.client;
    }

    this.client = new GoogleGenerativeAI(apiKeyStr);
    this.cachedApiKey = apiKeyStr;

    return this.client;
  }

  private async resolveModel(): Promise<string> {
    const model = await this.getModel();
    return model || GooglePromptTransformer.DEFAULT_MODEL;
  }

  async transform(transcription: string, context?: PromptContext): Promise<TransformedPrompt> {
    this.logger.info('Starting Google Gemini prompt transformation', {
      textLength: transcription.length,
      hasContext: !!context,
    });

    const client = await this.ensureClient();
    const modelName = await this.resolveModel();
    const systemPrompt = await this.getSystemPrompt();
    const userPrompt = buildUserPrompt(transcription, context);

    try {
      const startTime = Date.now();
      const model = client.getGenerativeModel({
        model: modelName,
        systemInstruction: systemPrompt,
      });

      this.logger.debug('Google Gemini transformation request', {
        model: modelName,
        promptLength: userPrompt.length,
      });

      const response = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2000,
        },
      });

      const duration = (Date.now() - startTime) / 1000;
      const transformedText = response.response.text() || transcription;
      const improvements = calculateImprovements(transcription, transformedText);

      this.logger.info('Google Gemini prompt transformation completed', {
        model: modelName,
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
      this.logger.error('Google Gemini prompt transformation failed', error as Error);

      if (error instanceof Error) {
        if (error.message.includes('API key not valid')) {
          throw new TransformationError('Invalid Google API key', error);
        }
        if (error.message.includes('429')) {
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
