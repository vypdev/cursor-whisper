import { GoogleGenerativeAI } from '@google/generative-ai';
import { GooglePromptTransformer } from '../../../infrastructure/transformation/GooglePromptTransformer';
import { createMockLogger } from '../../helpers/mockLogger';

jest.mock('@google/generative-ai');

const logger = createMockLogger();

describe('GooglePromptTransformer', () => {
  it('transforms transcription using Gemini API', async () => {
    const generateContent = jest.fn().mockResolvedValue({
      response: {
        text: () => 'Objective: Refactor authentication to JWT.',
      },
    });

    (GoogleGenerativeAI as unknown as jest.Mock).mockImplementation(() => ({
      getGenerativeModel: jest.fn(() => ({ generateContent })),
    }));

    const transformer = new GooglePromptTransformer(
      async () => 'google-key',
      async () => 'gemini-1.5-pro',
      logger
    );

    const result = await transformer.transform('refactor auth to jwt');

    expect(result.transformedText).toContain('JWT');
    expect(generateContent).toHaveBeenCalled();
  });
});
