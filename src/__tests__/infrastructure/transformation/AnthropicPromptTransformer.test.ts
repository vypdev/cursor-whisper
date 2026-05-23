import Anthropic from '@anthropic-ai/sdk';
import { AnthropicPromptTransformer } from '../../../infrastructure/transformation/AnthropicPromptTransformer';
import { createMockLogger } from '../../helpers/mockLogger';

jest.mock('@anthropic-ai/sdk');

const logger = createMockLogger();

describe('AnthropicPromptTransformer', () => {
  it('transforms transcription using Anthropic API', async () => {
    const create = jest.fn().mockResolvedValue({
      content: [{ type: 'text', text: 'Objective: Refactor authentication to JWT.' }],
    });

    (Anthropic as unknown as jest.Mock).mockImplementation(() => ({
      messages: { create },
    }));

    const transformer = new AnthropicPromptTransformer(
      async () => 'anthropic-key',
      async () => 'claude-3-5-sonnet-20241022',
      logger
    );

    const result = await transformer.transform('refactor auth to jwt');

    expect(result.transformedText).toContain('JWT');
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'claude-3-5-sonnet-20241022' })
    );
  });
});
