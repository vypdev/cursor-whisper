import * as vscode from 'vscode';
import { IConfigRepository } from '../../application/ports/IConfigRepository';
import { ILogger } from '../../application/ports/ILogger';
import { PromptTransformerFactory } from '../../infrastructure/transformation/PromptTransformerFactory';
import {
  OpenAIModelService,
  OpenAIModelServiceError,
} from '../../infrastructure/openai/OpenAIModelService';
import { PROVIDER_METADATA } from '../../domain/value-objects/TransformationProvider';
import { TransformationProvider } from '../../domain/value-objects/TransformationProvider';
import {
  applyProviderConfiguration,
  configureProviderCredentials,
  confirmOptimizationIntro,
  selectModelForProvider,
  selectTransformationProvider,
} from '../setup/providerConfigurationFlow';

export function registerConfigureTransformationProviderCommand(
  _context: vscode.ExtensionContext,
  configRepo: IConfigRepository,
  transformerFactory: PromptTransformerFactory,
  modelService: OpenAIModelService,
  logger: ILogger
): vscode.Disposable {
  return vscode.commands.registerCommand(
    'promptimize.configureTransformationProvider',
    async () => {
      const config = await configRepo.getConfig();

      const proceed = await confirmOptimizationIntro();
      if (!proceed) {
        return;
      }

      const provider = await selectTransformationProvider(config.transformationProvider);
      if (!provider) {
        return;
      }

      const configured = await configureProviderCredentials(provider, configRepo);
      if (!configured) {
        return;
      }

      if (
        provider === TransformationProvider.OpenAI &&
        !(await configRepo.getProviderApiKey(provider))
      ) {
        await vscode.window.showWarningMessage(
          'Configure your OpenAI API key first. It is required for Whisper transcription and OpenAI optimization.'
        );
        return;
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
        const message =
          error instanceof OpenAIModelServiceError
            ? error.message
            : error instanceof Error
              ? error.message
              : 'Unknown error';
        await vscode.window.showErrorMessage(`Failed to load models: ${message}`);
        return;
      }

      const applied = await applyProviderConfiguration(
        provider,
        selectedModel,
        configRepo,
        transformerFactory
      );

      const metadata = PROVIDER_METADATA[provider];
      if (!applied.success) {
        await vscode.window.showWarningMessage(
          `Provider set to ${metadata.displayName}, but configuration is incomplete: ${applied.message}`
        );
        return;
      }

      logger.info('Transformation provider updated', { provider, model: selectedModel });
      await vscode.window
        .showInformationMessage(
          `Prompt optimization provider set to ${metadata.displayName}${
            selectedModel ? ` (${selectedModel})` : ''
          }. Whisper transcription still uses OpenAI.`,
          'Test Optimization',
          'Learn About Providers'
        )
        .then(async selection => {
          if (selection === 'Test Optimization') {
            await vscode.commands.executeCommand('promptimize.testTransformation');
          } else if (selection === 'Learn About Providers') {
            await vscode.env.openExternal(
              vscode.Uri.parse(
                'https://github.com/vypdev/cursor-whisper/blob/master/docs/configuration/README.md'
              )
            );
          }
        });
    }
  );
}
