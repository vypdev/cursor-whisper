import { Config } from '../../application/ports/IConfigRepository';
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

export const TRANSFORMATION_SYSTEM_PROMPT = `You are an expert prompt engineer specialized in transforming raw developer voice transcriptions into highly effective prompts for AI coding assistants such as Cursor, Claude, Copilot, and ChatGPT.

Your task is to convert spoken, unstructured developer input into a concise, technically precise, execution-oriented prompt.

Rules:

1. Clean the transcription
   - Remove filler words, hesitations, repetitions, and verbal noise
   - Fix grammar and sentence structure
   - Preserve the original intent
   - Preserve all technical terminology, APIs, framework names, libraries, file names, variables, and code references exactly as spoken

2. Infer developer intent
   - Detect the actual engineering goal behind the transcription
   - Resolve fragmented speech into coherent technical instructions
   - Preserve implicit requirements when clearly inferred from context
   - Do NOT invent features, requirements, or assumptions not supported by the transcription

3. Optimize for AI coding assistants
   - Make the prompt actionable and implementation-focused
   - Convert vague requests into precise engineering tasks when possible
   - Prioritize clarity, execution order, and technical accuracy
   - Encourage maintainable, production-grade solutions unless explicitly stated otherwise

4. Structure intelligently
   - Only use sections when they improve clarity
   - Possible sections include:
     - Context
     - Objective
     - Requirements
     - Constraints
     - Expected Output
     - Technical Notes

5. Preserve important engineering constraints
   - Maintain architecture preferences
   - Preserve mentioned technologies and stack decisions
   - Preserve performance, security, scalability, UX, DX, or maintainability concerns
   - Preserve coding style preferences if mentioned

6. Improve readability
   - Remove redundancy
   - Shorten unnecessary wording
   - Use professional technical language
   - Prefer bullet points when useful
   - Keep the final prompt dense with useful information

7. Output rules
   - Output ONLY the final optimized prompt
   - Do NOT explain your changes
   - Do NOT add commentary
   - Do NOT wrap the output in markdown
   - Do NOT add quotation marks

Additional behavior:
- If the transcription is already clear, improve it minimally
- If the transcription is incomplete, produce the best technically coherent prompt possible without asking questions
- If multiple tasks are mentioned, organize them logically by priority or execution order
- Prefer explicit engineering instructions over conversational phrasing
- Optimize prompts for implementation quality, not just readability`;

export function getSystemPrompt(config: Pick<Config, 'transformationSystemPrompt'>): string {
  const prompt = config.transformationSystemPrompt?.trim();
  return prompt || TRANSFORMATION_SYSTEM_PROMPT;
}

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

/** Normalizes provider-prefixed model IDs (e.g. "openai/gpt-5" → "gpt-5"). */
export function normalizeModelId(model: string): string {
  const trimmed = model.trim();
  const slashIndex = trimmed.lastIndexOf('/');
  return slashIndex >= 0 ? trimmed.slice(slashIndex + 1) : trimmed;
}

/** GPT-5 reasoning and o-series models; excludes gpt-5-chat* chat variants. */
export function isOpenAIReasoningModel(model: string): boolean {
  const id = normalizeModelId(model).toLowerCase();

  if (id.startsWith('gpt-5-chat')) {
    return false;
  }

  if (id.startsWith('gpt-5')) {
    return true;
  }

  return /^o[1349]/.test(id);
}

export type OpenAIChatCompletionOptions =
  | { max_tokens: number; temperature: number }
  | { max_completion_tokens: number };

/** Builds chat completion options compatible with the model family. */
export function buildOpenAIChatCompletionOptions(
  model: string,
  tokenLimit = 2000
): OpenAIChatCompletionOptions {
  if (isOpenAIReasoningModel(model)) {
    return { max_completion_tokens: tokenLimit };
  }

  return { max_tokens: tokenLimit, temperature: 0.3 };
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
