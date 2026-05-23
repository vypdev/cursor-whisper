import {
  buildUserPrompt,
  calculateImprovements,
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
    expect(TRANSFORMATION_SYSTEM_PROMPT).toContain('structured');
  });
});
