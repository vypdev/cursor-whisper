import { Agent } from '@cursor/sdk';
import { IPromptTransformer, PromptContext } from '../../application/ports/IPromptTransformer';
import { TransformedPrompt } from '../../application/dto/TransformedPrompt';
import { ILogger } from '../../application/ports/ILogger';
import {
  TransformationError,
  buildUserPrompt,
  calculateImprovements,
} from './transformationUtils';

export const CURSOR_MODELS = [
  'composer-2.5',
  'composer-2.5-fast',
  'claude-4.5-sonnet',
  'gpt-5.1',
  'gpt-5.2-codex',
] as const;

export class CursorPromptTransformer implements IPromptTransformer {
  static readonly DEFAULT_MODEL = 'composer-2.5';

  constructor(
    private readonly getApiKey: () => Promise<string | undefined>,
    private readonly getModel: () => Promise<string | undefined>,
    private readonly getSystemPrompt: () => Promise<string>,
    private readonly logger: ILogger
  ) {}

  async transform(transcription: string, context?: PromptContext): Promise<TransformedPrompt> {
    this.logger.info('Starting Cursor SDK prompt transformation', {
      textLength: transcription.length,
      hasContext: !!context,
    });

    const apiKey = await this.getApiKey();
    if (!apiKey) {
      throw new TransformationError(
        'Cursor API key not configured. Get your key at https://cursor.com/dashboard/integrations'
      );
    }

    const model = (await this.getModel()) || CursorPromptTransformer.DEFAULT_MODEL;
    const systemPrompt = await this.getSystemPrompt();
    const userPrompt = buildUserPrompt(transcription, context);

    try {
      const startTime = Date.now();

      this.logger.debug('Cursor SDK transformation request', {
        model,
        promptLength: userPrompt.length,
      });

      const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

      const result = await Agent.prompt(fullPrompt, {
        apiKey,
        model: { id: model },
        local: { cwd: process.cwd() },
      });

      const duration = (Date.now() - startTime) / 1000;

      if (result.status === 'error') {
        throw new TransformationError(
          'Cursor agent run failed. Check your API key and network connection.'
        );
      }

      const transformedText = result.result?.trim() || transcription;
      const improvements = calculateImprovements(transcription, transformedText);

      this.logger.info('Cursor SDK prompt transformation completed', {
        model,
        duration: duration.toFixed(2) + 's',
        status: result.status,
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
      this.logger.error('Cursor SDK prompt transformation failed', error as Error);

      if (error instanceof TransformationError) {
        throw error;
      }

      if (error instanceof Error) {
        const message = error.message.toLowerCase();

        if (message.includes('api key') || message.includes('auth') || message.includes('401')) {
          throw new TransformationError(
            'Invalid Cursor API key. Get your key at https://cursor.com/dashboard/integrations',
            error
          );
        }

        if (message.includes('model') || message.includes('404')) {
          throw new TransformationError(
            `Model '${model}' is not available. Try 'composer-2.5', 'claude-4.5-sonnet', or 'gpt-5.1'.`,
            error
          );
        }

        if (
          message.includes('network') ||
          message.includes('econnrefused') ||
          message.includes('timeout')
        ) {
          throw new TransformationError(
            'Network error connecting to Cursor API. Check your internet connection.',
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
