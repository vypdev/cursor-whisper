import * as vscode from 'vscode';
import { IConfigRepository } from '../../application/ports/IConfigRepository';
import { ILogger } from '../../application/ports/ILogger';
import { IPromptTransformer } from '../../application/ports/IPromptTransformer';
import { PromptTransformerFactory } from '../../infrastructure/transformation/PromptTransformerFactory';
import { OpenAIModelService } from '../../infrastructure/openai/OpenAIModelService';
import { ConfigurationPanel } from '../webview/ConfigurationPanel';

export function registerOpenConfigurationPanelCommand(
  context: vscode.ExtensionContext,
  configRepo: IConfigRepository,
  transformerFactory: PromptTransformerFactory,
  modelService: OpenAIModelService,
  promptTransformer: IPromptTransformer,
  logger: ILogger
): vscode.Disposable {
  return vscode.commands.registerCommand('cursor-whisper.openConfigurationPanel', () => {
    ConfigurationPanel.render(
      context,
      configRepo,
      transformerFactory,
      modelService,
      promptTransformer,
      logger
    );
  });
}
