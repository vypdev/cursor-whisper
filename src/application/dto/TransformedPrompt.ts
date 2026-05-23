export interface TransformedPrompt {
  /**
   * Original transcribed text.
   */
  originalText: string;

  /**
   * Transformed/optimized text.
   */
  transformedText: string;

  /**
   * List of improvements made.
   */
  improvements: string[];

  /**
   * Optional sections extracted by transformer.
   */
  sections?: {
    context?: string;
    objectives?: string[];
    requirements?: string[];
    constraints?: string[];
  };
}
