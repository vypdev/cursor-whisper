import * as vscode from 'vscode';
import { IConfigRepository } from '../../application/ports/IConfigRepository';
import { ILogger } from '../../application/ports/ILogger';
import { IPromptTransformer } from '../../application/ports/IPromptTransformer';
import { PromptTransformerFactory } from '../../infrastructure/transformation/PromptTransformerFactory';
import { OpenAIModelService } from '../../infrastructure/openai/OpenAIModelService';
import {
  TransformationProvider,
  PROVIDER_METADATA,
} from '../../domain/value-objects/TransformationProvider';
import {
  WHISPER_SERVICE_DESCRIPTION,
  OPTIMIZATION_SERVICE_DESCRIPTION,
  OPENAI_API_KEY_SUCCESS,
  SETUP_WIZARD_GLOBAL_STATE_KEY,
} from '../../shared/constants/uxMessages';
import {
  applyProviderConfiguration,
  configureProviderCredentials,
  formatProviderComparisonForWizard,
  promptForOpenAiApiKey,
  selectModelForProvider,
  selectTransformationProvider,
  testOpenAiApiKey,
} from '../setup/providerConfigurationFlow';

const SAMPLE_TRANSCRIPTION =
  'I need to refactor the authentication service to use JWT tokens instead of sessions.';

export function registerFirstTimeSetupCommand(
  context: vscode.ExtensionContext,
  configRepo: IConfigRepository,
  transformerFactory: PromptTransformerFactory,
  modelService: OpenAIModelService,
  promptTransformer: IPromptTransformer,
  logger: ILogger
): vscode.Disposable {
  return vscode.commands.registerCommand('cursor-whisper.firstTimeSetup', async () => {
    await runSetupWizard(
      context,
      configRepo,
      transformerFactory,
      modelService,
      promptTransformer,
      logger
    );
  });
}

export async function runSetupWizard(
  context: vscode.ExtensionContext,
  configRepo: IConfigRepository,
  transformerFactory: PromptTransformerFactory,
  modelService: OpenAIModelService,
  promptTransformer: IPromptTransformer,
  logger: ILogger
): Promise<void> {
  const welcome = await vscode.window.showInformationMessage(
    'Welcome to Cursor Whisper',
    {
      modal: true,
      detail: `${WHISPER_SERVICE_DESCRIPTION}\n\n${OPTIMIZATION_SERVICE_DESCRIPTION}\n\nThis wizard will configure transcription first, then optionally set up prompt optimization.`,
    },
    'Get Started',
    'Cancel'
  );

  if (welcome !== 'Get Started') {
    return;
  }

  let openAiKey = await configRepo.getProviderApiKey(TransformationProvider.OpenAI);
  if (!openAiKey) {
    const enteredKey = await promptForOpenAiApiKey();
    if (!enteredKey) {
      await vscode.window.showWarningMessage(
        'Setup cancelled. An OpenAI API key is required for Whisper transcription.'
      );
      return;
    }

    await configRepo.updateConfig({ apiKey: enteredKey });
    openAiKey = enteredKey;
  }

  const whisperTest = await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Testing OpenAI connection for Whisper transcription...',
      cancellable: false,
    },
    async () => testOpenAiApiKey(modelService)
  );

  if (!whisperTest.ok) {
    const retry = await vscode.window.showErrorMessage(
      `OpenAI API key test failed: ${whisperTest.message}`,
      'Try Again',
      'Cancel'
    );
    if (retry === 'Try Again') {
      await runSetupWizard(
        context,
        configRepo,
        transformerFactory,
        modelService,
        promptTransformer,
        logger
      );
    }
    return;
  }

  await vscode.window.showInformationMessage('Whisper transcription is configured.', {
    detail: OPENAI_API_KEY_SUCCESS,
  });

  const enableOptimization = await vscode.window.showInformationMessage(
    'Enable AI prompt optimization?',
    {
      modal: true,
      detail: `${formatProviderComparisonForWizard()}\n\nChoose "No" to insert raw Whisper transcription only.`,
    },
    'Yes, optimize prompts',
    'No, transcription only'
  );

  if (enableOptimization === 'No, transcription only') {
    await configRepo.updateConfig({ enablePromptTransformation: false });
    await completeSetup(
      context,
      configRepo,
      'Transcription only (Whisper). Prompt optimization is disabled.'
    );
    return;
  }

  if (enableOptimization !== 'Yes, optimize prompts') {
    return;
  }

  await configRepo.updateConfig({ enablePromptTransformation: true });

  const config = await configRepo.getConfig();
  const provider = await selectTransformationProvider(config.transformationProvider);
  if (!provider) {
    return;
  }

  if (provider === TransformationProvider.OpenAI) {
    const reuseKey = await vscode.window.showInformationMessage(
      'Reuse your OpenAI API key for prompt optimization?',
      {
        modal: true,
        detail:
          'The same OpenAI key used for Whisper can also power GPT prompt optimization, or you can enter a different key.',
      },
      'Reuse Whisper key',
      'Use a different key'
    );

    if (reuseKey === 'Use a different key') {
      const configured = await configureProviderCredentials(provider, configRepo);
      if (!configured) {
        return;
      }
    }
  } else {
    const configured = await configureProviderCredentials(provider, configRepo);
    if (!configured) {
      return;
    }
  }

  let selectedModel: string | undefined;
  try {
    selectedModel = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Loading models for ${PROVIDER_METADATA[provider].displayName}...`,
        cancellable: false,
      },
      async () => selectModelForProvider(provider, configRepo, modelService, logger)
    );
  } catch (error) {
    await vscode.window.showErrorMessage(
      `Failed to load models: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    return;
  }

  const applied = await applyProviderConfiguration(
    provider,
    selectedModel,
    configRepo,
    transformerFactory
  );

  if (!applied.success) {
    await vscode.window.showWarningMessage(
      `Provider saved, but configuration is incomplete: ${applied.message ?? 'Unknown error'}`
    );
    return;
  }

  const transformTest = await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Testing prompt optimization with ${PROVIDER_METADATA[provider].displayName}...`,
      cancellable: false,
    },
    async () => {
      try {
        await promptTransformer.transform(SAMPLE_TRANSCRIPTION, {
          editorLanguage: 'typescript',
          projectType: 'Node.js/JavaScript',
        });
        return { ok: true as const };
      } catch (error) {
        return {
          ok: false as const,
          message: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }
  );

  if (!transformTest.ok) {
    const retry = await vscode.window.showErrorMessage(
      `Prompt optimization test failed: ${transformTest.message}`,
      'Continue Anyway',
      'Cancel'
    );
    if (retry !== 'Continue Anyway') {
      return;
    }
  }

  const providerMeta = PROVIDER_METADATA[provider];
  await completeSetup(
    context,
    configRepo,
    `Transcription: OpenAI Whisper. Optimization: ${providerMeta.displayName}${selectedModel ? ` (${selectedModel})` : ''}.`
  );
  logger.info('Setup wizard completed', { provider, model: selectedModel });
}

async function completeSetup(
  context: vscode.ExtensionContext,
  configRepo: IConfigRepository,
  summary: string
): Promise<void> {
  await context.globalState.update(SETUP_WIZARD_GLOBAL_STATE_KEY, true);

  const selection = await vscode.window.showInformationMessage(
    'Cursor Whisper setup complete!',
    {
      modal: true,
      detail: `${summary}\n\nPress Cmd/Ctrl+Alt+V to record your first prompt.`,
    },
    'Start Recording',
    'Open Documentation'
  );

  if (selection === 'Start Recording') {
    await vscode.commands.executeCommand('cursor-whisper.startRecording');
  } else if (selection === 'Open Documentation') {
    await vscode.env.openExternal(
      vscode.Uri.parse('https://github.com/vypdev/cursor-whisper/blob/main/docs/quickstart.md')
    );
  }

  await configRepo.getConfig();
}

export function isSetupCompleted(context: vscode.ExtensionContext): boolean {
  return context.globalState.get<boolean>(SETUP_WIZARD_GLOBAL_STATE_KEY) === true;
}

export async function getSetupChecklist(
  context: vscode.ExtensionContext,
  configRepo: IConfigRepository
): Promise<Array<{ label: string; complete: boolean }>> {
  const config = await configRepo.getConfig();
  const openAiKey = await configRepo.getProviderApiKey(TransformationProvider.OpenAI);
  const setupCompleted = isSetupCompleted(context);

  const items: Array<{ label: string; complete: boolean }> = [
    { label: 'Extension installed', complete: true },
    { label: 'OpenAI API key configured (Whisper)', complete: Boolean(openAiKey) },
  ];

  if (config.enablePromptTransformation) {
    const providerMeta = PROVIDER_METADATA[config.transformationProvider];
    const providerKey = providerMeta.requiresApiKey
      ? await configRepo.getProviderApiKey(config.transformationProvider)
      : true;
    items.push({
      label: `Optimization provider configured (${providerMeta.displayName})`,
      complete: Boolean(providerKey),
    });
  } else {
    items.push({ label: 'Prompt optimization configured (disabled)', complete: true });
  }

  items.push({ label: 'Setup wizard completed', complete: setupCompleted });

  return items;
}
