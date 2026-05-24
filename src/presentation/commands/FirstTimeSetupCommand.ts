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

export function registerFirstTimeSetupCommand(
  _context: vscode.ExtensionContext,
  _configRepo: IConfigRepository,
  _transformerFactory: PromptTransformerFactory,
  _modelService: OpenAIModelService,
  _promptTransformer: IPromptTransformer,
  _logger: ILogger
): vscode.Disposable {

  return vscode.commands.registerCommand('promptimize.firstTimeSetup', async () => {
    await vscode.commands.executeCommand('promptimize.openConfigurationPanel');
  });
}

export async function getSetupChecklist(
  configRepo: IConfigRepository
): Promise<Array<{ label: string; complete: boolean }>> {
  const config = await configRepo.getConfig();
  const openAiKey = await configRepo.getProviderApiKey(TransformationProvider.OpenAI);

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

  return items;
}
