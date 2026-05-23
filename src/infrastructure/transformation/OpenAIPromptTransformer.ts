import OpenAI from 'openai';
import { IPromptTransformer, PromptContext } from '../../application/ports/IPromptTransformer';
import { TransformedPrompt } from '../../application/dto/TransformedPrompt';
import { ILogger } from '../../application/ports/ILogger';
import { ApiKey } from '../../domain/value-objects/ApiKey';

export class TransformationError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'TransformationError';
  }
}

export class OpenAIPromptTransformer implements IPromptTransformer {
  private client: OpenAI | null = null;
  private cachedApiKey: string | null = null;
  static readonly DEFAULT_MODEL = 'gpt-4o';

  private static readonly SYSTEM_PROMPT = `You are an expert at transforming natural speech into structured, optimized prompts for AI coding assistants.

Given a voice transcription, transform it into a clear, structured prompt following these rules:

1. Remove filler words ("um", "uh", "like", etc.)
2. Fix grammar and sentence structure
3. Preserve technical terms exactly
4. Structure into sections when appropriate:
   - Context (what's the situation)
   - Objective (what needs to be done)
   - Requirements (specific needs)
   - Constraints (limitations or preferences)

5. Make it concise but complete
6. Use technical language appropriate for developers
7. Remove redundancy

Output ONLY the transformed prompt, no explanations.`;

  constructor(
    private readonly getApiKey: () => Promise<string | undefined>,
    private readonly getModel: () => Promise<string | undefined>,
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
    this.logger.info('Starting prompt transformation', {
      textLength: transcription.length,
      hasContext: !!context,
    });

    const client = await this.ensureClient();
    const model = await this.resolveModel();

    try {
      // Build user prompt with context
      let userPrompt = `Transform this voice transcription into a clear, structured prompt:\n\n${transcription}`;

      if (context?.editorLanguage) {
        userPrompt += `\n\nContext: User is working in ${context.editorLanguage}`;
      }

      if (context?.projectType) {
        userPrompt += `\nProject type: ${context.projectType}`;
      }

      const startTime = Date.now();

      this.logger.debug('GPT transformation request', {
        model,
        temperature: 0.3,
        promptLength: userPrompt.length,
      });

      const response = await client.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content: OpenAIPromptTransformer.SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
        temperature: 0.3, // Low temperature for consistency
        max_tokens: 2000,
      });

      const duration = (Date.now() - startTime) / 1000;

      const transformedText = response.choices[0]?.message?.content || transcription;

      // Calculate improvements (simple heuristics)
      const improvements = this.calculateImprovements(transcription, transformedText);

      this.logger.info('Prompt transformation completed', {
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
      this.logger.error('Prompt transformation failed', error as Error);

      if (error instanceof OpenAI.APIError) {
        if (error.status === 404 || error.code === 'model_not_found') {
          throw new TransformationError(
            `Model '${model}' is not available for your API key. Use "Cursor Whisper: Configure Model" to choose another model.`,
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

  private calculateImprovements(original: string, transformed: string): string[] {
    const improvements: string[] = [];

    // Check if filler words were removed
    const fillers = ['um', 'uh', 'like', 'you know', 'basically', 'actually'];
    const hadFillers = fillers.some(filler => original.toLowerCase().includes(filler));
    const hasFewerFillers = fillers.every(
      filler =>
        (original.toLowerCase().match(new RegExp(filler, 'g')) || []).length >=
        (transformed.toLowerCase().match(new RegExp(filler, 'g')) || []).length
    );

    if (hadFillers && hasFewerFillers) {
      improvements.push('Removed filler words');
    }

    // Check if text was shortened
    if (transformed.length < original.length * 0.9) {
      improvements.push('Made more concise');
    }

    // Check if structure was added
    if (
      transformed.includes('Context:') ||
      transformed.includes('Objective:') ||
      transformed.includes('Requirements:')
    ) {
      improvements.push('Added clear structure');
    }

    // Check if grammar was improved (simple heuristic)
    if (transformed.split('.').length > original.split('.').length) {
      improvements.push('Improved sentence structure');
    }

    return improvements;
  }
}
