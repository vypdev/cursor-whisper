import axios from 'axios';
import OpenAI from 'openai';
import { OpenCodePromptTransformer } from '../../../infrastructure/transformation/OpenCodePromptTransformer';
import { TRANSFORMATION_SYSTEM_PROMPT } from '../../../infrastructure/transformation/transformationUtils';
import { createMockLogger } from '../../helpers/mockLogger';

jest.mock('axios');
jest.mock('openai');

const mockedAxios = axios as jest.Mocked<typeof axios>;
const MockedOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>;
const logger = createMockLogger();

describe('OpenCodePromptTransformer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('checks proxy availability', async () => {
    mockedAxios.get.mockResolvedValueOnce({ status: 200, data: { data: [] } });

    await expect(
      OpenCodePromptTransformer.isAvailable('http://127.0.0.1:4010/v1')
    ).resolves.toBe(true);
  });

  it('lists available models', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      status: 200,
      data: {
        data: [{ id: 'anthropic/claude-sonnet-4-5' }, { id: 'ollama/llama3.2' }],
      },
    });

    await expect(
      OpenCodePromptTransformer.listModels('http://127.0.0.1:4010/v1')
    ).resolves.toEqual(['anthropic/claude-sonnet-4-5', 'ollama/llama3.2']);
  });

  it('transforms transcription using OpenCode proxy', async () => {
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

    const transformer = new OpenCodePromptTransformer(
      async () => ({
        baseUrl: 'http://127.0.0.1:4010/v1',
        model: 'anthropic/claude-sonnet-4-5',
      }),
      async () => undefined,
      async () => TRANSFORMATION_SYSTEM_PROMPT,
      logger
    );

    const result = await transformer.transform('um refactor auth to jwt');

    expect(result.transformedText).toContain('JWT');
    expect(MockedOpenAI).toHaveBeenCalledWith({
      apiKey: 'unused',
      baseURL: 'http://127.0.0.1:4010/v1',
    });
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'anthropic/claude-sonnet-4-5',
        temperature: 0.3,
      })
    );
  });

  it('uses authentication token when configured', async () => {
    const createMock = jest.fn().mockResolvedValue({
      choices: [{ message: { content: 'Transformed output.' } }],
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

    const transformer = new OpenCodePromptTransformer(
      async () => ({
        baseUrl: 'http://127.0.0.1:4010/v1',
        model: 'anthropic/claude-sonnet-4-5',
      }),
      async () => 'proxy-token',
      async () => TRANSFORMATION_SYSTEM_PROMPT,
      logger
    );

    await transformer.transform('hello world');

    expect(MockedOpenAI).toHaveBeenCalledWith({
      apiKey: 'proxy-token',
      baseURL: 'http://127.0.0.1:4010/v1',
    });
  });

  it('throws when model is not configured', async () => {
    const transformer = new OpenCodePromptTransformer(
      async () => ({ baseUrl: 'http://127.0.0.1:4010/v1', model: '' }),
      async () => undefined,
      async () => TRANSFORMATION_SYSTEM_PROMPT,
      logger
    );

    await expect(transformer.transform('hello')).rejects.toThrow('OpenCode model is not configured');
  });
});
