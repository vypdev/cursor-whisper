import { IPromptTransformer, PromptContext } from '../ports/IPromptTransformer';
import { IConfigRepository } from '../ports/IConfigRepository';
import { ILogger } from '../ports/ILogger';
import { Prompt } from '../../domain/entities/Prompt';
import { Transcription } from '../../domain/entities/Transcription';
import { generateId } from '../../shared/utils/generateId';

export class TransformPromptUseCase {
  constructor(
    private readonly promptTransformer: IPromptTransformer,
    private readonly configRepo: IConfigRepository,
    private readonly logger: ILogger
  ) {}

  async execute(transcription: Transcription, context?: PromptContext): Promise<Prompt> {
    this.logger.info('Starting prompt transformation');

    // Check if transformation is enabled
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
      const transformed = await this.promptTransformer.transform(transcription.text, context);

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
