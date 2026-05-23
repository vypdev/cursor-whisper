import { PromptContext } from '../../application/ports/IPromptTransformer';

export class TransformationError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'TransformationError';
  }
}

export const TRANSFORMATION_SYSTEM_PROMPT = `You are an expert at transforming natural speech into structured, optimized prompts for AI coding assistants.

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

export function buildUserPrompt(transcription: string, context?: PromptContext): string {
  let userPrompt = `Transform this voice transcription into a clear, structured prompt:\n\n${transcription}`;

  if (context?.editorLanguage) {
    userPrompt += `\n\nContext: User is working in ${context.editorLanguage}`;
  }

  if (context?.projectType) {
    userPrompt += `\nProject type: ${context.projectType}`;
  }

  return userPrompt;
}

export function calculateImprovements(original: string, transformed: string): string[] {
  const improvements: string[] = [];

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

  if (transformed.length < original.length * 0.9) {
    improvements.push('Made more concise');
  }

  if (
    transformed.includes('Context:') ||
    transformed.includes('Objective:') ||
    transformed.includes('Requirements:')
  ) {
    improvements.push('Added clear structure');
  }

  if (transformed.split('.').length > original.split('.').length) {
    improvements.push('Improved sentence structure');
  }

  return improvements;
}
