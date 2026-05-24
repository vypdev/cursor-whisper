import axios from 'axios';
import { OllamaPromptTransformer } from '../../../infrastructure/transformation/OllamaPromptTransformer';
import { TRANSFORMATION_SYSTEM_PROMPT } from '../../../infrastructure/transformation/transformationUtils';
import { createMockLogger } from '../../helpers/mockLogger';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const logger = createMockLogger();

describe('OllamaPromptTransformer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('checks server availability', async () => {
    mockedAxios.get.mockResolvedValueOnce({ status: 200, data: { models: [] } });

    await expect(OllamaPromptTransformer.isAvailable('http://localhost:11434')).resolves.toBe(
      true
    );
  });

  it('lists available models', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      status: 200,
      data: { models: [{ name: 'llama3.1:8b' }, { name: 'mistral:latest' }] },
    });

    await expect(OllamaPromptTransformer.listModels('http://localhost:11434')).resolves.toEqual([
      'llama3.1:8b',
      'mistral:latest',
    ]);
  });

  it('transforms transcription using Ollama API', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      status: 200,
      data: { response: 'Refactor auth service to JWT with backward compatibility.' },
    });

    const transformer = new OllamaPromptTransformer(
      async () => ({ baseUrl: 'http://localhost:11434', model: 'llama3.1:8b' }),
      async () => TRANSFORMATION_SYSTEM_PROMPT,
      logger
    );

    const result = await transformer.transform('um refactor auth to jwt');

    expect(result.transformedText).toContain('JWT');
    expect(mockedAxios.post).toHaveBeenCalledWith(
      'http://localhost:11434/api/generate',
      expect.objectContaining({ model: 'llama3.1:8b', stream: false }),
      expect.any(Object)
    );
  });

  it('uses configured system prompt in Ollama request', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      status: 200,
      data: { response: 'Transformed output.' },
    });

    const customPrompt = 'Custom system prompt for transformation.';
    const transformer = new OllamaPromptTransformer(
      async () => ({ baseUrl: 'http://localhost:11434', model: 'llama3.1:8b' }),
      async () => customPrompt,
      logger
    );

    await transformer.transform('hello world');

    expect(mockedAxios.post).toHaveBeenCalledWith(
      'http://localhost:11434/api/generate',
      expect.objectContaining({
        prompt: expect.stringContaining(customPrompt),
      }),
      expect.any(Object)
    );
  });
});
