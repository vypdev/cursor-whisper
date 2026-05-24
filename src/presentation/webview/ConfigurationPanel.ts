import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { IConfigRepository } from '../../application/ports/IConfigRepository';
import { ILogger } from '../../application/ports/ILogger';
import { IPromptTransformer } from '../../application/ports/IPromptTransformer';
import { PromptTransformerFactory } from '../../infrastructure/transformation/PromptTransformerFactory';
import { OpenAIModelService } from '../../infrastructure/openai/OpenAIModelService';
import { OllamaPromptTransformer } from '../../infrastructure/transformation/OllamaPromptTransformer';
import { OpenCodePromptTransformer } from '../../infrastructure/transformation/OpenCodePromptTransformer';
import { OpenRouterPromptTransformer } from '../../infrastructure/transformation/OpenRouterPromptTransformer';
import { CURSOR_MODELS } from '../../infrastructure/transformation/CursorPromptTransformer';
import {
  TransformationProvider,
  PROVIDER_METADATA,
  isTransformationProvider,
} from '../../domain/value-objects/TransformationProvider';
import { ApiKey } from '../../domain/value-objects/ApiKey';
import { PROVIDER_COMPARISON } from '../../shared/constants/providerComparison';
import { ProviderPricingService } from '../../application/services/ProviderPricingService';
import { isOptimizationProviderConfigured } from '../../application/services/ConfigurationValidationService';
import { getNonce } from '../../shared/utils/getNonce';
import {
  applyProviderConfiguration,
  testOpenAiApiKey,
} from '../setup/providerConfigurationFlow';
import { TRANSFORMATION_SYSTEM_PROMPT } from '../../infrastructure/transformation/transformationUtils';

const ANTHROPIC_MODELS = [
  'claude-3-5-sonnet-20241022',
  'claude-3-5-haiku-20241022',
  'claude-3-opus-20240229',
  'claude-3-sonnet-20240229',
  'claude-3-haiku-20240307',
];

const GOOGLE_MODELS = ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.0-flash'];

const SAMPLE_TRANSCRIPTION =
  'I need to refactor the authentication service to use JWT tokens instead of sessions.';

export interface ConfigurationWebviewState {
  whisperConfigured: boolean;
  whisperApiKeyMasked: string;
  enablePromptTransformation: boolean;
  transformationProvider: TransformationProvider;
  providers: Array<{
    id: TransformationProvider;
    displayName: string;
    description: string;
    requiresApiKey: boolean;
    defaultModel: string;
  }>;
  providerComparison: Array<{
    displayName: string;
    costPerTransform: string;
    speed: string;
    privacy: string;
    bestFor: string;
    isRealTime: boolean;
  }>;
  model: string;
  azureEndpoint: string;
  azureDeployment: string;
  ollamaBaseUrl: string;
  openCodeBaseUrl: string;
  providerApiKeyMasked: string;
  providerConfigured: boolean;
  transformationSystemPrompt: string;
}

type WebviewToExtensionMessage =
  | { type: 'ready' }
  | { type: 'requestConfig' }
  | { type: 'saveOpenAiApiKey'; apiKey: string }
  | { type: 'saveEnableOptimization'; enabled: boolean }
  | { type: 'saveProvider'; provider: string }
  | { type: 'saveProviderApiKey'; provider: string; apiKey: string }
  | {
      type: 'saveProviderSettings';
      azureEndpoint?: string;
      azureDeployment?: string;
      ollamaBaseUrl?: string;
      openCodeBaseUrl?: string;
      model?: string;
    }
  | { type: 'getModels'; provider: string }
  | { type: 'testWhisper' }
  | { type: 'testOptimization' }
  | { type: 'saveSystemPrompt'; systemPrompt: string }
  | { type: 'resetSystemPrompt' }
  | { type: 'openDocs' };

function isWebviewMessage(value: unknown): value is WebviewToExtensionMessage {
  return typeof value === 'object' && value !== null && 'type' in value;
}

function maskApiKey(apiKey: string | undefined): string {
  if (!apiKey) {
    return '';
  }
  if (apiKey.length <= 8) {
    return '••••••••';
  }
  return `${apiKey.slice(0, 3)}...${apiKey.slice(-4)}`;
}

function getModelForProvider(
  config: Awaited<ReturnType<IConfigRepository['getConfig']>>,
  provider: TransformationProvider
): string {
  switch (provider) {
    case TransformationProvider.OpenAI:
      return config.transformationModel;
    case TransformationProvider.Anthropic:
      return config.anthropicModel;
    case TransformationProvider.Google:
      return config.googleModel;
    case TransformationProvider.Azure:
      return config.azureDeployment;
    case TransformationProvider.Ollama:
      return config.ollamaModel;
    case TransformationProvider.OpenCode:
      return config.openCodeModel;
    case TransformationProvider.OpenRouter:
      return config.openRouterModel;
    case TransformationProvider.Cursor:
      return config.cursorModel;
  }
}

export class ConfigurationPanel {
  public static currentPanel: ConfigurationPanel | undefined;
  private static readonly pricingService = new ProviderPricingService();

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    private readonly context: vscode.ExtensionContext,
    private readonly configRepo: IConfigRepository,
    private readonly transformerFactory: PromptTransformerFactory,
    private readonly modelService: OpenAIModelService,
    private readonly promptTransformer: IPromptTransformer,
    private readonly logger: ILogger
  ) {
    this._panel = panel;
    this._extensionUri = extensionUri;

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    this._panel.webview.onDidReceiveMessage(
      message => {
        void this._handleMessage(message);
      },
      undefined,
      this._disposables
    );

    const configChangeDisposable = vscode.workspace.onDidChangeConfiguration(() => {
      void this._sendConfigState();
    });
    this._disposables.push(configChangeDisposable);

    this._panel.webview.html = this._getWebviewContent(this._panel.webview);

    // Send initial state after HTML is set to ensure webview receives it
    // even if there's a timing issue with the 'ready' message
    setTimeout(() => {
      this.logger.info('Sending initial config state after HTML setup');
      void this._sendConfigState();
    }, 100);
  }

  public static render(
    context: vscode.ExtensionContext,
    configRepo: IConfigRepository,
    transformerFactory: PromptTransformerFactory,
    modelService: OpenAIModelService,
    promptTransformer: IPromptTransformer,
    logger: ILogger
  ): void {
    const column = vscode.window.activeTextEditor?.viewColumn ?? vscode.ViewColumn.One;

    if (ConfigurationPanel.currentPanel) {
      ConfigurationPanel.currentPanel._panel.reveal(column);
      void ConfigurationPanel.currentPanel._sendConfigState();
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'promptimizeConfiguration',
      'Promptimize Configuration',
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(context.extensionUri, 'out', 'presentation', 'webview'),
        ],
      }
    );

    ConfigurationPanel.currentPanel = new ConfigurationPanel(
      panel,
      context.extensionUri,
      context,
      configRepo,
      transformerFactory,
      modelService,
      promptTransformer,
      logger
    );
  }

  public dispose(): void {
    ConfigurationPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      disposable?.dispose();
    }
  }

  private async _handleMessage(message: unknown): Promise<void> {
    if (!isWebviewMessage(message)) {
      this.logger.warn('Invalid webview message received', {
        message: typeof message === 'object' ? JSON.stringify(message) : String(message),
      });
      return;
    }

    this.logger.debug('Webview message received', { type: message.type });

    switch (message.type) {
      case 'ready':
        this.logger.info('Webview ready, sending config state');
        await new Promise(resolve => setTimeout(resolve, 150));
        await this._sendConfigState();
        break;
      case 'requestConfig':
        this.logger.info('Webview requesting config state');
        await this._sendConfigState();
        break;
      case 'saveOpenAiApiKey':
        await this._saveOpenAiApiKey(message.apiKey);
        break;
      case 'saveEnableOptimization':
        await this._saveEnableOptimization(message.enabled);
        break;
      case 'saveProvider':
        await this._saveProvider(message.provider);
        break;
      case 'saveProviderApiKey':
        await this._saveProviderApiKey(message.provider, message.apiKey);
        break;
      case 'saveProviderSettings':
        await this._saveProviderSettings(message);
        break;
      case 'getModels':
        await this._loadModels(message.provider);
        break;
      case 'testWhisper':
        await this._testWhisper();
        break;
      case 'testOptimization':
        await this._testOptimization();
        break;
      case 'saveSystemPrompt':
        await this._saveSystemPrompt(message.systemPrompt);
        break;
      case 'resetSystemPrompt':
        await this._resetSystemPrompt();
        break;
      case 'openDocs':
        await vscode.env.openExternal(
          vscode.Uri.parse('https://github.com/vypdev/cursor-whisper/tree/master/docs')
        );
        break;
    }
  }

  private async _buildConfigState(): Promise<ConfigurationWebviewState> {
    const config = await this.configRepo.getConfig();
    const openAiKey = await this.configRepo.getProviderApiKey(TransformationProvider.OpenAI);
    const provider = config.transformationProvider;
    const metadata = PROVIDER_METADATA[provider];
    const providerKey = metadata.requiresApiKey
      ? await this.configRepo.getProviderApiKey(provider)
      : 'local';

    const providerConfigured = await isOptimizationProviderConfigured(this.configRepo, config);

    return {
      whisperConfigured: Boolean(openAiKey),
      whisperApiKeyMasked: maskApiKey(openAiKey),
      enablePromptTransformation: config.enablePromptTransformation,
      transformationProvider: provider,
      providers: Object.values(PROVIDER_METADATA).map(meta => ({
        id: meta.id,
        displayName: meta.displayName,
        description: meta.description,
        requiresApiKey: meta.requiresApiKey,
        defaultModel: meta.defaultModel,
      })),
      providerComparison: await this._getProviderComparisonData(),
      model: getModelForProvider(config, provider),
      azureEndpoint: config.azureEndpoint,
      azureDeployment: config.azureDeployment,
      ollamaBaseUrl: config.ollamaBaseUrl,
      openCodeBaseUrl: config.openCodeBaseUrl,
      providerApiKeyMasked: maskApiKey(typeof providerKey === 'string' ? providerKey : undefined),
      providerConfigured,
      transformationSystemPrompt: config.transformationSystemPrompt,
    };
  }

  private async _getProviderComparisonData(): Promise<ConfigurationWebviewState['providerComparison']> {
    try {
      const pricingData = await ConfigurationPanel.pricingService.getProviderComparison();
      return pricingData.map(entry => ({
        displayName: PROVIDER_METADATA[entry.provider].displayName,
        costPerTransform: entry.costPerTransform,
        speed: entry.speed,
        privacy: entry.privacy,
        bestFor: entry.bestFor,
        isRealTime: entry.isRealTime,
      }));
    } catch (error) {
      this.logger.warn('Failed to fetch provider pricing, using static data', {
        error: error instanceof Error ? error.message : String(error),
      });

      return PROVIDER_COMPARISON.map(entry => ({
        displayName: PROVIDER_METADATA[entry.provider].displayName,
        costPerTransform: entry.costPerTransform,
        speed: entry.speed,
        privacy: entry.privacy,
        bestFor: entry.bestFor,
        isRealTime: false,
      }));
    }
  }

  private async _sendConfigState(): Promise<void> {
    const state = await this._buildConfigState();
    this.logger.info('Sending config state to webview', {
      whisperConfigured: state.whisperConfigured,
      whisperApiKeyMasked: state.whisperApiKeyMasked ? '(set)' : '(empty)',
      provider: state.transformationProvider,
      optimizationEnabled: state.enablePromptTransformation,
      providerConfigured: state.providerConfigured,
      model: state.model,
    });
    await this._panel.webview.postMessage({ type: 'loadConfig', state });
    this.logger.info('Config state message posted to webview successfully');
  }

  private async _postConfigUpdated(): Promise<void> {
    const state = await this._buildConfigState();
    this.logger.info('Sending updated config state to webview', {
      whisperConfigured: state.whisperConfigured,
      provider: state.transformationProvider,
    });
    await this._panel.webview.postMessage({ type: 'configUpdated', state });
    this.logger.info('Updated config state message posted to webview successfully');
  }

  private async _saveOpenAiApiKey(apiKey: string): Promise<void> {
    try {
      new ApiKey(apiKey);
      await this.configRepo.updateConfig({ apiKey });
      await this._postSaveResult(true, 'OpenAI API key saved for Whisper transcription.');
      await this._postConfigUpdated();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid API key';
      await this._postSaveResult(false, message);
    }
  }

  private async _saveEnableOptimization(enabled: boolean): Promise<void> {
    await this.configRepo.updateConfig({ enablePromptTransformation: enabled });
    await this._postSaveResult(
      true,
      enabled ? 'Prompt optimization enabled.' : 'Prompt optimization disabled.'
    );
    await this._postConfigUpdated();
  }

  private async _saveProvider(providerValue: string): Promise<void> {
    if (!isTransformationProvider(providerValue)) {
      await this._postSaveResult(false, 'Invalid provider selected.');
      return;
    }

    const config = await this.configRepo.getConfig();
    const model = getModelForProvider(config, providerValue);
    const applied = await applyProviderConfiguration(
      providerValue,
      model,
      this.configRepo,
      this.transformerFactory
    );

    if (!applied.success) {
      await this._postSaveResult(false, applied.message ?? 'Provider configuration incomplete.');
    } else {
      await this._postSaveResult(
        true,
        `Provider set to ${PROVIDER_METADATA[providerValue].displayName}.`
      );
    }

    await this._postConfigUpdated();
    await this._loadModels(providerValue);
  }

  private async _saveProviderApiKey(providerValue: string, apiKey: string): Promise<void> {
    if (!isTransformationProvider(providerValue)) {
      await this._postSaveResult(false, 'Invalid provider.');
      return;
    }

    if (providerValue === TransformationProvider.OpenAI) {
      try {
        new ApiKey(apiKey);
      } catch (error) {
        await this._postSaveResult(false, error instanceof Error ? error.message : 'Invalid API key');
        return;
      }
    }

    if (!apiKey.trim()) {
      await this._postSaveResult(false, 'API key is required.');
      return;
    }

    await this.configRepo.setProviderApiKey(providerValue, apiKey.trim());
    await this._postSaveResult(true, `${PROVIDER_METADATA[providerValue].displayName} API key saved.`);
    await this._postConfigUpdated();
  }

  private async _saveProviderSettings(
    settings: Extract<WebviewToExtensionMessage, { type: 'saveProviderSettings' }>
  ): Promise<void> {
    const config = await this.configRepo.getConfig();
    const provider = config.transformationProvider;
    const updates: Parameters<IConfigRepository['updateConfig']>[0] = {};

    if (settings.azureEndpoint !== undefined) {
      updates.azureEndpoint = settings.azureEndpoint;
    }
    if (settings.azureDeployment !== undefined) {
      updates.azureDeployment = settings.azureDeployment;
    }
    if (settings.ollamaBaseUrl !== undefined) {
      updates.ollamaBaseUrl = settings.ollamaBaseUrl;
    }
    if (settings.openCodeBaseUrl !== undefined) {
      updates.openCodeBaseUrl = settings.openCodeBaseUrl;
    }

    if (settings.model) {
      switch (provider) {
        case TransformationProvider.OpenAI:
          updates.transformationModel = settings.model;
          break;
        case TransformationProvider.Anthropic:
          updates.anthropicModel = settings.model;
          break;
        case TransformationProvider.Google:
          updates.googleModel = settings.model;
          break;
        case TransformationProvider.Azure:
          updates.azureDeployment = settings.model;
          break;
        case TransformationProvider.Ollama:
          updates.ollamaModel = settings.model;
          break;
        case TransformationProvider.OpenCode:
          updates.openCodeModel = settings.model;
          break;
        case TransformationProvider.OpenRouter:
          updates.openRouterModel = settings.model;
          break;
        case TransformationProvider.Cursor:
          updates.cursorModel = settings.model;
          break;
      }
    }

    if (Object.keys(updates).length > 0) {
      await this.configRepo.updateConfig(updates);
      const validationError = await this.transformerFactory.validateProvider(provider);
      if (validationError) {
        await this._postSaveResult(false, validationError);
      } else {
        await this._postSaveResult(true, 'Settings saved.');
      }
      await this._postConfigUpdated();
    }
  }

  private async _loadModels(providerValue: string): Promise<void> {
    if (!isTransformationProvider(providerValue)) {
      return;
    }

    const config = await this.configRepo.getConfig();
    const selectedModel = getModelForProvider(config, providerValue);

    try {
      const models = await this._fetchModelsForProvider(providerValue, config);
      await this._panel.webview.postMessage({
        type: 'modelsLoaded',
        models,
        selectedModel: models.includes(selectedModel) ? selectedModel : models[0],
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load models';
      await this._panel.webview.postMessage({
        type: 'modelsLoaded',
        models: selectedModel ? [selectedModel] : [],
        selectedModel,
        error: message,
      });
    }
  }

  private async _fetchModelsForProvider(
    provider: TransformationProvider,
    config: Awaited<ReturnType<IConfigRepository['getConfig']>>
  ): Promise<string[]> {
    switch (provider) {
      case TransformationProvider.OpenAI:
        return this.modelService.listGptModels();
      case TransformationProvider.Anthropic:
        return ANTHROPIC_MODELS;
      case TransformationProvider.Google:
        return GOOGLE_MODELS;
      case TransformationProvider.Azure:
        return config.azureDeployment ? [config.azureDeployment] : [];
      case TransformationProvider.Ollama: {
        const baseUrl = config.ollamaBaseUrl || OllamaPromptTransformer.DEFAULT_BASE_URL;
        const available = await OllamaPromptTransformer.isAvailable(baseUrl);
        if (!available) {
          throw new Error('Ollama server is not reachable. Check the base URL.');
        }
        const models = await OllamaPromptTransformer.listModels(baseUrl);
        return models.length > 0 ? models : [config.ollamaModel || OllamaPromptTransformer.DEFAULT_MODEL];
      }
      case TransformationProvider.OpenCode: {
        const baseUrl = config.openCodeBaseUrl || OpenCodePromptTransformer.DEFAULT_BASE_URL;
        const apiKey = await this.configRepo.getProviderApiKey(TransformationProvider.OpenCode);
        const available = await OpenCodePromptTransformer.isAvailable(baseUrl, apiKey);
        if (!available) {
          throw new Error('OpenCode proxy is not reachable. Check the base URL.');
        }
        const models = await OpenCodePromptTransformer.listModels(baseUrl, apiKey);
        return models.length > 0
          ? models
          : config.openCodeModel
            ? [config.openCodeModel]
            : [];
      }
      case TransformationProvider.OpenRouter: {
        const apiKey = await this.configRepo.getProviderApiKey(TransformationProvider.OpenRouter);
        if (!apiKey) {
          throw new Error('OpenRouter API key is not configured.');
        }
        const models = await OpenRouterPromptTransformer.listModels(apiKey);
        return models.length > 0
          ? models
          : [config.openRouterModel || OpenRouterPromptTransformer.DEFAULT_MODEL];
      }
      case TransformationProvider.Cursor:
        return [...CURSOR_MODELS];
      default:
        return [];
    }
  }

  private async _testWhisper(): Promise<void> {
    const result = await testOpenAiApiKey(this.modelService);
    await this._panel.webview.postMessage({
      type: 'testResult',
      service: 'whisper',
      ok: result.ok,
      message: result.ok ? undefined : result.message,
    });
  }

  private async _testOptimization(): Promise<void> {
    const config = await this.configRepo.getConfig();
    if (!config.enablePromptTransformation) {
      await this._panel.webview.postMessage({
        type: 'testResult',
        service: 'optimization',
        ok: false,
        message: 'Prompt optimization is disabled.',
      });
      return;
    }

    const whisperTest = await testOpenAiApiKey(this.modelService);
    if (!whisperTest.ok) {
      await this._panel.webview.postMessage({
        type: 'testResult',
        service: 'optimization',
        ok: false,
        message: 'Configure Whisper first: ' + whisperTest.message,
      });
      return;
    }

    try {
      await this.promptTransformer.transform(SAMPLE_TRANSCRIPTION, {
        editorLanguage: 'typescript',
        projectType: 'Node.js/JavaScript',
      });
      await this._panel.webview.postMessage({
        type: 'testResult',
        service: 'optimization',
        ok: true,
      });
      this.logger.info('Optimization test passed from configuration panel');
    } catch (error) {
      await this._panel.webview.postMessage({
        type: 'testResult',
        service: 'optimization',
        ok: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async _saveSystemPrompt(systemPrompt: string): Promise<void> {
    const trimmed = systemPrompt.trim();
    if (!trimmed) {
      await this._postSaveResult(false, 'System prompt cannot be empty.');
      return;
    }

    try {
      await this.configRepo.updateConfig({ transformationSystemPrompt: trimmed });
      await this._postSaveResult(true, 'System prompt saved.');
      await this._postConfigUpdated();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save system prompt';
      await this._postSaveResult(false, message);
    }
  }

  private async _resetSystemPrompt(): Promise<void> {
    try {
      await this.configRepo.updateConfig({
        transformationSystemPrompt: TRANSFORMATION_SYSTEM_PROMPT,
      });
      await this._postSaveResult(true, 'System prompt reset to default.');
      await this._postConfigUpdated();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to reset system prompt';
      await this._postSaveResult(false, message);
    }
  }

  private async _postSaveResult(ok: boolean, message: string): Promise<void> {
    await this._panel.webview.postMessage({ type: 'saveResult', ok, message });
  }

  private _getWebviewContent(webview: vscode.Webview): string {
    const nonce = getNonce();
    const htmlPath = path.join(
      this.context.extensionPath,
      'out',
      'presentation',
      'webview',
      'configurationWebview.html'
    );

    if (!fs.existsSync(htmlPath)) {
      this.logger.error('Configuration webview HTML not found', new Error(htmlPath));
      throw new Error(
        'Configuration webview assets are missing. Run "pnpm run compile" and reload the extension.'
      );
    }

    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'out', 'presentation', 'webview', 'configurationWebview.css')
    );
    const toolkitUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'out', 'presentation', 'webview', 'toolkit.min.js')
    );

    if (!fs.existsSync(path.join(this.context.extensionPath, 'out', 'presentation', 'webview', 'toolkit.min.js'))) {
      this.logger.warn(
        'Webview UI toolkit bundle is missing. Run "pnpm run compile" to copy toolkit.min.js.'
      );
    }

    let html = fs.readFileSync(htmlPath, 'utf8');
    html = html.replace(/\{\{nonce\}\}/g, nonce);
    html = html.replace(/\{\{cspSource\}\}/g, webview.cspSource);
    html = html.replace(/\{\{styleUri\}\}/g, styleUri.toString());
    html = html.replace(/\{\{toolkitUri\}\}/g, toolkitUri.toString());

    this.logger.debug('Loaded configuration webview HTML', {
      htmlPath,
      styleUri: styleUri.toString(),
      toolkitUri: toolkitUri.toString(),
    });

    return html;
  }
}
