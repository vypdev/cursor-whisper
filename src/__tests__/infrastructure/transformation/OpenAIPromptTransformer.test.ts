import OpenAI from 'openai';
import { OpenAIPromptTransformer } from '../../../infrastructure/transformation/OpenAIPromptTransformer';
import { TRANSFORMATION_SYSTEM_PROMPT } from '../../../infrastructure/transformation/transformationUtils';
import { createMockLogger } from '../../helpers/mockLogger';

jest.mock('openai');

const MockedOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>;
const logger = createMockLogger();
const TEST_API_KEY = 'sk-test-openai-api-key-1234567890';

describe('OpenAIPromptTransformer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses max_completion_tokens for gpt-5 reasoning models', async () => {
    const createMock = jest.fn().mockResolvedValue({
      choices: [{ message: { content: 'Objective: Refactor authentication to JWT.' } }],
    });
    MockedOpenAI.mockImplementation(
      () =>
        ({
          chat: {
            completions: {
              create: createMock,
            },
          },
        }) as unknown as OpenAI
    );

    const transformer = new OpenAIPromptTransformer(
      async () => TEST_API_KEY,
      async () => 'gpt-5',
      async () => TRANSFORMATION_SYSTEM_PROMPT,
      logger
    );

    const result = await transformer.transform('refactor auth to jwt');

    expect(result.transformedText).toContain('JWT');
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-5',
        max_completion_tokens: 2000,
      })
    );
    expect(createMock).toHaveBeenCalledWith(
      expect.not.objectContaining({
        max_tokens: expect.anything(),
        temperature: expect.anything(),
      })
    );
  });

  it('uses max_tokens and temperature for gpt-4o', async () => {
    const createMock = jest.fn().mockResolvedValue({
      choices: [{ message: { content: 'Objective: Refactor authentication to JWT.' } }],
    });
    MockedOpenAI.mockImplementation(
      () =>
        ({
          chat: {
            completions: {
              create: createMock,
            },
          },
        }) as unknown as OpenAI
    );

    const transformer = new OpenAIPromptTransformer(
      async () => TEST_API_KEY,
      async () => 'gpt-4o',
      async () => TRANSFORMATION_SYSTEM_PROMPT,
      logger
    );

    await transformer.transform('refactor auth to jwt');

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-4o',
        max_tokens: 2000,
        temperature: 0.3,
      })
    );
  });

  it('throws when API key is missing', async () => {
    const transformer = new OpenAIPromptTransformer(
      async () => undefined,
      async () => 'gpt-4o',
      async () => TRANSFORMATION_SYSTEM_PROMPT,
      logger
    );

    await expect(transformer.transform('hello')).rejects.toThrow('OpenAI API key not configured');
  });
});
