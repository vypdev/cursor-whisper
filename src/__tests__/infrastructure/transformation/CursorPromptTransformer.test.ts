import { Agent } from '@cursor/sdk';
import { CursorPromptTransformer } from '../../../infrastructure/transformation/CursorPromptTransformer';
import { TRANSFORMATION_SYSTEM_PROMPT } from '../../../infrastructure/transformation/transformationUtils';
import { createMockLogger } from '../../helpers/mockLogger';

jest.mock('@cursor/sdk', () => ({
  Agent: {
    prompt: jest.fn(),
  },
}));

const logger = createMockLogger();

describe('CursorPromptTransformer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('transforms transcription using Cursor SDK', async () => {
    (Agent.prompt as jest.Mock).mockResolvedValue({
      status: 'finished',
      result: 'Objective: Refactor authentication to JWT.',
    });

    const transformer = new CursorPromptTransformer(
      async () => 'cursor-api-key',
      async () => 'composer-2.5',
      async () => TRANSFORMATION_SYSTEM_PROMPT,
      logger
    );

    const result = await transformer.transform('refactor auth to jwt');

    expect(result.transformedText).toContain('JWT');
    expect(Agent.prompt).toHaveBeenCalledWith(
      expect.stringContaining('refactor auth to jwt'),
      expect.objectContaining({
        apiKey: 'cursor-api-key',
        model: { id: 'composer-2.5' },
      })
    );
  });

  it('throws error when API key is not configured', async () => {
    const transformer = new CursorPromptTransformer(
      async () => undefined,
      async () => 'composer-2.5',
      async () => TRANSFORMATION_SYSTEM_PROMPT,
      logger
    );

    await expect(transformer.transform('test')).rejects.toThrow('Cursor API key not configured');
  });

  it('handles agent run errors', async () => {
    (Agent.prompt as jest.Mock).mockResolvedValue({
      status: 'error',
      result: null,
    });

    const transformer = new CursorPromptTransformer(
      async () => 'cursor-api-key',
      async () => 'composer-2.5',
      async () => TRANSFORMATION_SYSTEM_PROMPT,
      logger
    );

    await expect(transformer.transform('test')).rejects.toThrow('Cursor agent run failed');
  });
});
