import {
  buildOpenAIChatCompletionOptions,
  buildUserPrompt,
  calculateImprovements,
  getSystemPrompt,
  isOpenAIReasoningModel,
  normalizeModelId,
  TRANSFORMATION_SYSTEM_PROMPT,
} from '../../../infrastructure/transformation/transformationUtils';

describe('transformationUtils', () => {
  it('builds user prompt with optional context', () => {
    const prompt = buildUserPrompt('hello world', {
      editorLanguage: 'typescript',
      projectType: 'Node.js',
    });

    expect(prompt).toContain('hello world');
    expect(prompt).toContain('typescript');
    expect(prompt).toContain('Node.js');
  });

  it('detects improvements between original and transformed text', () => {
    const original = 'um I need to like refactor this service';
    const transformed = `Context: Auth service\nObjective: Refactor to JWT`;

    const improvements = calculateImprovements(original, transformed);

    expect(improvements).toContain('Removed filler words');
    expect(improvements).toContain('Added clear structure');
  });

  it('includes a system prompt', () => {
    expect(TRANSFORMATION_SYSTEM_PROMPT).toContain('prompt engineer');
  });

  it('returns configured system prompt when set', () => {
    expect(
      getSystemPrompt({ transformationSystemPrompt: 'Custom prompt for testing.' })
    ).toBe('Custom prompt for testing.');
  });

  it('falls back to default system prompt when empty', () => {
    expect(getSystemPrompt({ transformationSystemPrompt: '   ' })).toBe(
      TRANSFORMATION_SYSTEM_PROMPT
    );
  });

  describe('normalizeModelId', () => {
    it('strips provider prefix from OpenRouter-style IDs', () => {
      expect(normalizeModelId('openai/gpt-5')).toBe('gpt-5');
    });

    it('returns plain model IDs unchanged', () => {
      expect(normalizeModelId('gpt-4o')).toBe('gpt-4o');
    });
  });

  describe('isOpenAIReasoningModel', () => {
    it.each(['gpt-5', 'gpt-5-mini', 'gpt-5.1', 'o3-mini', 'openai/gpt-5'])(
      'detects reasoning model %s',
      model => {
        expect(isOpenAIReasoningModel(model)).toBe(true);
      }
    );

    it.each(['gpt-4o', 'gpt-5-chat-latest', 'gpt-5-chat'])(
      'does not treat %s as reasoning model',
      model => {
        expect(isOpenAIReasoningModel(model)).toBe(false);
      }
    );
  });

  describe('buildOpenAIChatCompletionOptions', () => {
    it('uses max_completion_tokens without temperature for gpt-5', () => {
      expect(buildOpenAIChatCompletionOptions('gpt-5')).toEqual({
        max_completion_tokens: 2000,
      });
    });

    it('uses max_tokens and temperature for gpt-4o', () => {
      expect(buildOpenAIChatCompletionOptions('gpt-4o')).toEqual({
        max_tokens: 2000,
        temperature: 0.3,
      });
    });

    it('uses max_tokens and temperature for gpt-5-chat-latest', () => {
      expect(buildOpenAIChatCompletionOptions('gpt-5-chat-latest')).toEqual({
        max_tokens: 2000,
        temperature: 0.3,
      });
    });

    it('respects custom token limit', () => {
      expect(buildOpenAIChatCompletionOptions('gpt-5', 500)).toEqual({
        max_completion_tokens: 500,
      });
    });
  });
});
