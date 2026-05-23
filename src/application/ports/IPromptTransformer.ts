import { TransformedPrompt } from '../dto/TransformedPrompt';

export interface PromptContext {
  /**
   * Programming language of active editor.
   */
  editorLanguage?: string;

  /**
   * Detected project type (Node.js, Python, etc.).
   */
  projectType?: string;

  /**
   * Previous prompts for context (future).
   */
  previousPrompts?: string[];
}

/**
 * Port for prompt transformation functionality.
 *
 * Implementations:
 * - OpenAIPromptTransformer (primary): Uses GPT-4
 * - RuleBasedTransformer (future): Uses regex/NLP rules
 */
export interface IPromptTransformer {
  /**
   * Transform raw transcription into structured prompt.
   *
   * @param transcription Raw transcription text
   * @param context Optional context for transformation
   * @returns Transformed prompt with improvements
   * @throws TransformationError if transformation fails
   */
  transform(transcription: string, context?: PromptContext): Promise<TransformedPrompt>;
}
