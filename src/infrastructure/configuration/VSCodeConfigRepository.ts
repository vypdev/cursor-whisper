import * as vscode from 'vscode';
import { IConfigRepository, Config } from '../../application/ports/IConfigRepository';
import { ConfigError } from '../../domain/errors/ConfigError';
import {
  TransformationProvider,
  getProviderSecretKey,
  parseTransformationProvider,
  PROVIDER_METADATA,
} from '../../domain/value-objects/TransformationProvider';
import { TRANSFORMATION_SYSTEM_PROMPT } from '../transformation/transformationUtils';
import { OpenCodePromptTransformer } from '../transformation/OpenCodePromptTransformer';

export class VSCodeConfigRepository implements IConfigRepository {
  private static readonly SECTION = 'promptimize';
  private static readonly SECRET_KEY = 'promptimize.openai.apiKey';
  private static readonly LEGACY_SECRET_KEY = 'openai-api-key';
  static readonly DEFAULT_TRANSFORMATION_MODEL = 'gpt-4o';
  private callbacks: Array<(config: Config) => void> = [];

  constructor(
    _context: vscode.ExtensionContext,
    private readonly secretStorage: vscode.SecretStorage
  ) {
    vscode.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration(VSCodeConfigRepository.SECTION)) {
        void this.notifyConfigChange();
      }
    });
  }

  private async notifyConfigChange(): Promise<void> {
    const config = await this.getConfig();
    this.callbacks.forEach(callback => callback(config));
  }

  async getConfig(): Promise<Config> {
    const config = vscode.workspace.getConfiguration(VSCodeConfigRepository.SECTION);

    const apiKey = await this.getProviderApiKey(TransformationProvider.OpenAI);

    return {
      apiKey,
      transformationProvider: parseTransformationProvider(
        config.get<string>('transformationProvider'),
        TransformationProvider.OpenAI
      ),
      transcriptionLanguage: config.get<string>('transcriptionLanguage', 'auto'),
      enablePromptTransformation: config.get<boolean>('enablePromptTransformation', true),
      transformationModel: config.get<string>(
        'transformationModel',
        VSCodeConfigRepository.DEFAULT_TRANSFORMATION_MODEL
      ),
      anthropicModel: config.get<string>(
        'anthropicModel',
        PROVIDER_METADATA[TransformationProvider.Anthropic].defaultModel
      ),
      googleModel: config.get<string>(
        'googleModel',
        PROVIDER_METADATA[TransformationProvider.Google].defaultModel
      ),
      azureEndpoint: config.get<string>('azureEndpoint', ''),
      azureDeployment: config.get<string>('azureDeployment', ''),
      ollamaBaseUrl: config.get<string>('ollamaBaseUrl', 'http://localhost:11434'),
      ollamaModel: config.get<string>(
        'ollamaModel',
        PROVIDER_METADATA[TransformationProvider.Ollama].defaultModel
      ),
      openCodeBaseUrl: config.get<string>(
        'openCodeBaseUrl',
        OpenCodePromptTransformer.DEFAULT_BASE_URL
      ),
      openCodeModel: config.get<string>(
        'openCodeModel',
        PROVIDER_METADATA[TransformationProvider.OpenCode].defaultModel
      ),
      openRouterModel: config.get<string>(
        'openRouterModel',
        PROVIDER_METADATA[TransformationProvider.OpenRouter].defaultModel
      ),
      cursorModel: config.get<string>(
        'cursorModel',
        PROVIDER_METADATA[TransformationProvider.Cursor].defaultModel
      ),
      audioQuality: config.get<'low' | 'medium' | 'high'>('audioQuality', 'high'),
      maxRecordingDuration: config.get<number>('maxRecordingDuration', 120),
      showNotifications: config.get<boolean>('showNotifications', true),
      transcriptionHint: config.get<string>('transcriptionHint'),
      transformationSystemPrompt: config.get<string>(
        'transformationSystemPrompt',
        TRANSFORMATION_SYSTEM_PROMPT
      ),
    };
  }

  async getProviderApiKey(provider: TransformationProvider): Promise<string | undefined> {
    if (provider === TransformationProvider.OpenAI) {
      let apiKey = await this.secretStorage.get(getProviderSecretKey(provider));
      if (!apiKey) {
        apiKey = await this.secretStorage.get(VSCodeConfigRepository.SECRET_KEY);
      }
      if (!apiKey) {
        const legacyKey = await this.secretStorage.get(VSCodeConfigRepository.LEGACY_SECRET_KEY);
        if (legacyKey) {
          apiKey = legacyKey;
          await this.secretStorage.store(getProviderSecretKey(provider), legacyKey);
          await this.secretStorage.store(VSCodeConfigRepository.SECRET_KEY, legacyKey);
          await this.secretStorage.delete(VSCodeConfigRepository.LEGACY_SECRET_KEY);
        }
      }
      return apiKey;
    }

    return this.secretStorage.get(getProviderSecretKey(provider));
  }

  async setProviderApiKey(
    provider: TransformationProvider,
    apiKey: string | undefined
  ): Promise<void> {
    try {
      const secretKey = getProviderSecretKey(provider);

      if (apiKey) {
        await this.secretStorage.store(secretKey, apiKey);
        if (provider === TransformationProvider.OpenAI) {
          await this.secretStorage.store(VSCodeConfigRepository.SECRET_KEY, apiKey);
          await this.secretStorage.delete(VSCodeConfigRepository.LEGACY_SECRET_KEY);
        }
      } else {
        await this.secretStorage.delete(secretKey);
        if (provider === TransformationProvider.OpenAI) {
          await this.secretStorage.delete(VSCodeConfigRepository.SECRET_KEY);
          await this.secretStorage.delete(VSCodeConfigRepository.LEGACY_SECRET_KEY);
        }
      }
    } catch {
      throw new ConfigError(
        'Failed to save API key securely. Check your system keychain settings.'
      );
    }

    await this.notifyConfigChange();
  }

  async updateConfig(partialConfig: Partial<Config>): Promise<void> {
    const config = vscode.workspace.getConfiguration(VSCodeConfigRepository.SECTION);

    if (partialConfig.apiKey !== undefined) {
      await this.setProviderApiKey(TransformationProvider.OpenAI, partialConfig.apiKey);
    }

    const updates: Array<Thenable<void>> = [];

    const stringFields: Array<keyof Config> = [
      'transformationProvider',
      'transcriptionLanguage',
      'transformationModel',
      'anthropicModel',
      'googleModel',
      'azureEndpoint',
      'azureDeployment',
      'ollamaBaseUrl',
      'ollamaModel',
      'openCodeBaseUrl',
      'openCodeModel',
      'openRouterModel',
      'cursorModel',
      'transformationSystemPrompt',
    ];

    for (const field of stringFields) {
      const value = partialConfig[field];
      if (value !== undefined && typeof value === 'string') {
        updates.push(config.update(field, value, vscode.ConfigurationTarget.Global));
      }
    }

    if (partialConfig.enablePromptTransformation !== undefined) {
      updates.push(
        config.update(
          'enablePromptTransformation',
          partialConfig.enablePromptTransformation,
          vscode.ConfigurationTarget.Global
        )
      );
    }

    if (partialConfig.audioQuality !== undefined) {
      updates.push(
        config.update('audioQuality', partialConfig.audioQuality, vscode.ConfigurationTarget.Global)
      );
    }

    if (partialConfig.maxRecordingDuration !== undefined) {
      updates.push(
        config.update(
          'maxRecordingDuration',
          partialConfig.maxRecordingDuration,
          vscode.ConfigurationTarget.Global
        )
      );
    }

    if (partialConfig.showNotifications !== undefined) {
      updates.push(
        config.update(
          'showNotifications',
          partialConfig.showNotifications,
          vscode.ConfigurationTarget.Global
        )
      );
    }

    await Promise.all(updates);
  }

  onConfigChange(callback: (config: Config) => void): void {
    this.callbacks.push(callback);
  }
}
