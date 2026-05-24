import { getSetupChecklist } from '../../../presentation/commands/FirstTimeSetupCommand';
import { IConfigRepository, Config } from '../../../application/ports/IConfigRepository';
import { TransformationProvider } from '../../../domain/value-objects/TransformationProvider';
import { TRANSFORMATION_SYSTEM_PROMPT } from '../../../infrastructure/transformation/transformationUtils';

const baseConfig: Config = {
  transformationProvider: TransformationProvider.OpenAI,
  transcriptionLanguage: 'auto',
  enablePromptTransformation: true,
  transformationModel: 'gpt-4o',
  anthropicModel: 'claude-3-5-sonnet-20241022',
  googleModel: 'gemini-1.5-pro',
  azureEndpoint: 'https://example.openai.azure.com',
  azureDeployment: 'gpt-4o',
  ollamaBaseUrl: 'http://localhost:11434',
  ollamaModel: 'llama3.1:8b',
  openCodeBaseUrl: 'http://127.0.0.1:4010/v1',
  openCodeModel: 'anthropic/claude-sonnet-4-5',
  openRouterModel: 'openai/gpt-4o',
  cursorModel: 'composer-2.5',
  audioQuality: 'high',
  maxRecordingDuration: 120,
  showNotifications: true,
  transformationSystemPrompt: TRANSFORMATION_SYSTEM_PROMPT,
};

function createConfigRepo(
  overrides: Partial<Config> = {},
  providerKeys: Partial<Record<TransformationProvider, string | undefined>> = {}
): IConfigRepository {
  const config = { ...baseConfig, ...overrides };

  return {
    getConfig: jest.fn(async () => config),
    updateConfig: jest.fn(async () => undefined),
    getProviderApiKey: jest.fn(async provider => {
      if (provider in providerKeys) {
        return providerKeys[provider];
      }
      return provider === TransformationProvider.OpenAI ? 'openai-key' : 'provider-key';
    }),
    setProviderApiKey: jest.fn(async () => undefined),
    onConfigChange: jest.fn(),
  };
}

describe('getSetupChecklist', () => {
  it('marks checklist complete when Whisper and optimization provider are configured', async () => {
    const configRepo = createConfigRepo();

    const checklist = await getSetupChecklist(configRepo);

    expect(checklist.every(item => item.complete)).toBe(true);
    expect(checklist).toEqual([
      { label: 'Extension installed', complete: true },
      { label: 'OpenAI API key configured (Whisper)', complete: true },
      { label: 'Optimization provider configured (OpenAI)', complete: true },
    ]);
  });

  it('marks Whisper incomplete when OpenAI key is missing', async () => {
    const configRepo = createConfigRepo({}, { [TransformationProvider.OpenAI]: undefined });

    const checklist = await getSetupChecklist(configRepo);

    expect(checklist.some(item => !item.complete)).toBe(true);
    expect(checklist.find(item => item.label.includes('Whisper'))?.complete).toBe(false);
  });

  it('marks optimization disabled as complete when transformation is disabled', async () => {
    const configRepo = createConfigRepo({ enablePromptTransformation: false });

    const checklist = await getSetupChecklist(configRepo);

    expect(checklist).toEqual([
      { label: 'Extension installed', complete: true },
      { label: 'OpenAI API key configured (Whisper)', complete: true },
      { label: 'Prompt optimization configured (disabled)', complete: true },
    ]);
  });

  it('marks optimization provider incomplete when enabled but key is missing', async () => {
    const configRepo = createConfigRepo(
      { transformationProvider: TransformationProvider.Anthropic },
      {
        [TransformationProvider.OpenAI]: 'openai-key',
        [TransformationProvider.Anthropic]: undefined,
      }
    );

    const checklist = await getSetupChecklist(configRepo);

    expect(checklist.find(item => item.label.includes('Anthropic'))?.complete).toBe(false);
  });

  it('marks Ollama optimization incomplete when base URL or model is missing', async () => {
    const configRepo = createConfigRepo({
      transformationProvider: TransformationProvider.Ollama,
      ollamaBaseUrl: '',
      ollamaModel: '',
    });

    const checklist = await getSetupChecklist(configRepo);

    expect(checklist.find(item => item.label.includes('Ollama'))?.complete).toBe(false);
  });
});
