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
import { SETUP_WIZARD_GLOBAL_STATE_KEY } from '../../shared/constants/uxMessages';

export function registerFirstTimeSetupCommand(
  _context: vscode.ExtensionContext,
  _configRepo: IConfigRepository,
  _transformerFactory: PromptTransformerFactory,
  _modelService: OpenAIModelService,
  _promptTransformer: IPromptTransformer,
  _logger: ILogger
): vscode.Disposable {

  return vscode.commands.registerCommand('cursor-whisper.firstTimeSetup', async () => {
    await vscode.commands.executeCommand('cursor-whisper.openConfigurationPanel');
  });
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

  items.push({ label: 'Configuration completed', complete: setupCompleted });

  return items;
}
