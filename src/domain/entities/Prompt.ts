import { ValidationError } from '../errors/ValidationError';

export class Prompt {
  constructor(
    public readonly id: string,
    public readonly transcriptionId: string,
    public readonly originalText: string,
    public readonly transformedText: string,
    public readonly improvements: string[],
    public readonly timestamp: Date
  ) {
    this.validate();
  }

  private validate(): void {
    if (!this.originalText || this.originalText.trim().length === 0) {
      throw new ValidationError('Original text cannot be empty');
    }

    if (!this.transformedText || this.transformedText.trim().length === 0) {
      throw new ValidationError('Transformed text cannot be empty');
    }
  }

  wasTransformed(): boolean {
    return this.originalText !== this.transformedText;
  }

  getCompressionRatio(): number {
    return this.transformedText.length / this.originalText.length;
  }

  hasImprovements(): boolean {
    return this.improvements.length > 0;
  }

  getSummary(): string {
    return `Prompt (${this.transformedText.length} chars, ${this.improvements.length} improvements)`;
  }
}
