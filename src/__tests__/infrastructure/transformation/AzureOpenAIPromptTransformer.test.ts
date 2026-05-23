import OpenAI from 'openai';
import { AzureOpenAIPromptTransformer } from '../../../infrastructure/transformation/AzureOpenAIPromptTransformer';
import { createMockLogger } from '../../helpers/mockLogger';

jest.mock('openai');

const logger = createMockLogger();

describe('AzureOpenAIPromptTransformer', () => {
  it('transforms transcription using Azure OpenAI deployment', async () => {
    const create = jest.fn().mockResolvedValue({
      choices: [{ message: { content: 'Objective: Refactor authentication to JWT.' } }],
    });

    (OpenAI as unknown as jest.Mock).mockImplementation(() => ({
      chat: { completions: { create } },
    }));

    const transformer = new AzureOpenAIPromptTransformer(
      async () => 'azure-key',
      async () => ({
        endpoint: 'https://example.openai.azure.com',
        deployment: 'gpt-4o',
      }),
      logger
    );

    const result = await transformer.transform('refactor auth to jwt');

    expect(OpenAI).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: 'https://example.openai.azure.com/openai/deployments/gpt-4o',
      })
    );
    expect(result.transformedText).toContain('JWT');
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gpt-4o' })
    );
  });
});
