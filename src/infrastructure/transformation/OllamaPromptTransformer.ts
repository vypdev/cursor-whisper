import axios from 'axios';
import { IPromptTransformer, PromptContext } from '../../application/ports/IPromptTransformer';
import { TransformedPrompt } from '../../application/dto/TransformedPrompt';
import { ILogger } from '../../application/ports/ILogger';
import {
  TransformationError,
  TRANSFORMATION_SYSTEM_PROMPT,
  buildUserPrompt,
  calculateImprovements,
} from './transformationUtils';

export interface OllamaConfig {
  baseUrl: string;
  model: string;
}

interface OllamaGenerateResponse {
  response?: string;
  error?: string;
}

interface OllamaTagsResponse {
  models?: Array<{ name: string }>;
}

export class OllamaPromptTransformer implements IPromptTransformer {
  static readonly DEFAULT_BASE_URL = 'http://localhost:11434';
  static readonly DEFAULT_MODEL = 'llama3.1:8b';

  constructor(
    private readonly getOllamaConfig: () => Promise<OllamaConfig>,
    private readonly logger: ILogger
  ) {}

  private normalizeBaseUrl(baseUrl: string): string {
    return baseUrl.replace(/\/+$/, '');
  }

  static async isAvailable(baseUrl: string): Promise<boolean> {
    try {
      const normalized = baseUrl.replace(/\/+$/, '');
      const response = await axios.get(`${normalized}/api/tags`, { timeout: 3000 });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  static async listModels(baseUrl: string): Promise<string[]> {
    const normalized = baseUrl.replace(/\/+$/, '');
    const response = await axios.get<OllamaTagsResponse>(`${normalized}/api/tags`, {
      timeout: 5000,
    });
    return (response.data.models ?? []).map(model => model.name).sort();
  }

  async transform(transcription: string, context?: PromptContext): Promise<TransformedPrompt> {
    this.logger.info('Starting Ollama prompt transformation', {
      textLength: transcription.length,
      hasContext: !!context,
    });

    const config = await this.getOllamaConfig();
    const baseUrl = this.normalizeBaseUrl(config.baseUrl || OllamaPromptTransformer.DEFAULT_BASE_URL);
    const model = config.model || OllamaPromptTransformer.DEFAULT_MODEL;
    const userPrompt = buildUserPrompt(transcription, context);

    const available = await OllamaPromptTransformer.isAvailable(baseUrl);
    if (!available) {
      throw new TransformationError(
        `Ollama server is not reachable at ${baseUrl}. Start Ollama and try again.`
      );
    }

    try {
      const startTime = Date.now();

      this.logger.debug('Ollama transformation request', {
        baseUrl,
        model,
        promptLength: userPrompt.length,
      });

      const response = await axios.post<OllamaGenerateResponse>(
        `${baseUrl}/api/generate`,
        {
          model,
          prompt: `${TRANSFORMATION_SYSTEM_PROMPT}\n\n${userPrompt}`,
          stream: false,
          options: {
            temperature: 0.3,
          },
        },
        { timeout: 120000 }
      );

      if (response.data.error) {
        throw new TransformationError(response.data.error);
      }

      const duration = (Date.now() - startTime) / 1000;
      const transformedText = response.data.response?.trim() || transcription;
      const improvements = calculateImprovements(transcription, transformedText);

      this.logger.info('Ollama prompt transformation completed', {
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
      this.logger.error('Ollama prompt transformation failed', error as Error);

      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED') {
          throw new TransformationError(
            `Cannot connect to Ollama at ${baseUrl}. Ensure Ollama is running.`,
            error
          );
        }
        if (error.response?.status === 404) {
          throw new TransformationError(
            `Model '${model}' was not found in Ollama. Pull it with: ollama pull ${model}`,
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
