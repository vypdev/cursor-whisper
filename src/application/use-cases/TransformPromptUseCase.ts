import { PromptContext } from '../ports/IPromptTransformer';
import { IConfigRepository } from '../ports/IConfigRepository';
import { ILogger } from '../ports/ILogger';
import { Prompt } from '../../domain/entities/Prompt';
import { Transcription } from '../../domain/entities/Transcription';
import { generateId } from '../../shared/utils/generateId';
import { PromptTransformerFactory } from '../../infrastructure/transformation/PromptTransformerFactory';

export class TransformPromptUseCase {
  constructor(
    private readonly transformerFactory: PromptTransformerFactory,
    private readonly configRepo: IConfigRepository,
    private readonly logger: ILogger
  ) {}

  async execute(transcription: Transcription, context?: PromptContext): Promise<Prompt> {
    this.logger.info('Starting prompt transformation');

    const config = await this.configRepo.getConfig();
    if (!config.enablePromptTransformation) {
      this.logger.info('Prompt transformation disabled, returning original text');
      return new Prompt(
        generateId(),
        transcription.id,
        transcription.text,
        transcription.text,
        [],
        new Date()
      );
    }

    try {
      const validationError = await this.transformerFactory.validateProvider(
        config.transformationProvider
      );
      if (validationError) {
        throw new Error(validationError);
      }

      const promptTransformer = await this.transformerFactory.create();
      const transformed = await promptTransformer.transform(transcription.text, context);

      this.logger.info('Prompt transformation completed', {
        originalLength: transformed.originalText.length,
        transformedLength: transformed.transformedText.length,
        improvements: transformed.improvements.length,
        compressionRatio: (
          transformed.transformedText.length / transformed.originalText.length
        ).toFixed(2),
      });

      const prompt = new Prompt(
        generateId(),
        transcription.id,
        transformed.originalText,
        transformed.transformedText,
        transformed.improvements,
        new Date()
      );

      return prompt;
    } catch (error) {
      this.logger.error('Prompt transformation failed, falling back to original text', error as Error);
      // Fallback: return original text if transformation fails
      return new Prompt(
        generateId(),
        transcription.id,
        transcription.text,
        transcription.text,
        [],
        new Date()
      );
    }
  }
}
