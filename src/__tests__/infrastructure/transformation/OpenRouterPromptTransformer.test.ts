import axios from 'axios';
import OpenAI from 'openai';
import { OpenRouterPromptTransformer } from '../../../infrastructure/transformation/OpenRouterPromptTransformer';
import { TRANSFORMATION_SYSTEM_PROMPT } from '../../../infrastructure/transformation/transformationUtils';
import { createMockLogger } from '../../helpers/mockLogger';

jest.mock('axios');
jest.mock('openai');

const mockedAxios = axios as jest.Mocked<typeof axios>;
const MockedOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>;
const logger = createMockLogger();
const TEST_API_KEY = 'sk-or-v1-test-openrouter-api-key-1234567890';

describe('OpenRouterPromptTransformer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists available models', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      status: 200,
      data: {
        data: [{ id: 'openai/gpt-4o' }, { id: 'anthropic/claude-3.5-sonnet' }],
      },
    });

    await expect(OpenRouterPromptTransformer.listModels(TEST_API_KEY)).resolves.toEqual([
      'anthropic/claude-3.5-sonnet',
      'openai/gpt-4o',
    ]);
  });

  it('transforms transcription using OpenRouter', async () => {
    const createMock = jest.fn().mockResolvedValue({
      choices: [{ message: { content: 'Refactor auth service to JWT with backward compatibility.' } }],
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

    const transformer = new OpenRouterPromptTransformer(
      async () => TEST_API_KEY,
      async () => 'openai/gpt-4o',
      async () => TRANSFORMATION_SYSTEM_PROMPT,
      logger
    );

    const result = await transformer.transform('um refactor auth to jwt');

    expect(result.transformedText).toContain('JWT');
    expect(MockedOpenAI).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: TEST_API_KEY,
        baseURL: 'https://openrouter.ai/api/v1',
        defaultHeaders: expect.objectContaining({
          'X-OpenRouter-Title': 'Promptimize',
        }),
      })
    );
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'openai/gpt-4o',
        temperature: 0.3,
      })
    );
  });

  it('throws when API key is missing', async () => {
    const transformer = new OpenRouterPromptTransformer(
      async () => undefined,
      async () => 'openai/gpt-4o',
      async () => TRANSFORMATION_SYSTEM_PROMPT,
      logger
    );

    await expect(transformer.transform('hello')).rejects.toThrow('OpenRouter API key not configured');
  });

  it('maps invalid API key errors', async () => {
    const apiError = Object.assign(new Error('Unauthorized'), {
      status: 401,
    });
    Object.setPrototypeOf(apiError, OpenAI.APIError.prototype);

    MockedOpenAI.mockImplementation(
      () =>
        ({
          chat: {
            completions: {
              create: jest.fn().mockRejectedValue(apiError),
            },
          },
        }) as unknown as OpenAI
    );

    const transformer = new OpenRouterPromptTransformer(
      async () => TEST_API_KEY,
      async () => 'openai/gpt-4o',
      async () => TRANSFORMATION_SYSTEM_PROMPT,
      logger
    );

    await expect(transformer.transform('hello')).rejects.toThrow('Invalid OpenRouter API key');
  });
});
