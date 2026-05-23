import * as vscode from 'vscode';
import { IConfigRepository, Config } from '../../application/ports/IConfigRepository';
import { ConfigError } from '../../domain/errors/ConfigError';

export class VSCodeConfigRepository implements IConfigRepository {
  private static readonly SECTION = 'cursorWhisper';
  private static readonly SECRET_KEY = 'cursor-whisper.openai.apiKey';
  private static readonly LEGACY_SECRET_KEY = 'openai-api-key';
  private callbacks: Array<(config: Config) => void> = [];

  constructor(
    _context: vscode.ExtensionContext,
    private readonly secretStorage: vscode.SecretStorage
  ) {
    // Watch for configuration changes
    vscode.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration(VSCodeConfigRepository.SECTION)) {
        void this.getConfig().then(config => {
          this.callbacks.forEach(callback => callback(config));
        });
      }
    });
  }

  async getConfig(): Promise<Config> {
    const config = vscode.workspace.getConfiguration(VSCodeConfigRepository.SECTION);

    // Get API key from secure storage (migrate legacy key if present)
    let apiKey = await this.secretStorage.get(VSCodeConfigRepository.SECRET_KEY);
    if (!apiKey) {
      const legacyKey = await this.secretStorage.get(VSCodeConfigRepository.LEGACY_SECRET_KEY);
      if (legacyKey) {
        apiKey = legacyKey;
        await this.secretStorage.store(VSCodeConfigRepository.SECRET_KEY, legacyKey);
        await this.secretStorage.delete(VSCodeConfigRepository.LEGACY_SECRET_KEY);
      }
    }

    return {
      apiKey,
      transcriptionLanguage: config.get<string>('transcriptionLanguage', 'auto'),
      enablePromptTransformation: config.get<boolean>('enablePromptTransformation', false),
      audioQuality: config.get<'low' | 'medium' | 'high'>('audioQuality', 'high'),
      maxRecordingDuration: config.get<number>('maxRecordingDuration', 120),
      showNotifications: config.get<boolean>('showNotifications', true),
      transcriptionHint: config.get<string>('transcriptionHint'),
    };
  }

  async updateConfig(partialConfig: Partial<Config>): Promise<void> {
    const config = vscode.workspace.getConfiguration(VSCodeConfigRepository.SECTION);

    // Handle API key separately (secure storage)
    if (partialConfig.apiKey !== undefined) {
      try {
        if (partialConfig.apiKey) {
          await this.secretStorage.store(
            VSCodeConfigRepository.SECRET_KEY,
            partialConfig.apiKey
          );
          await this.secretStorage.delete(VSCodeConfigRepository.LEGACY_SECRET_KEY);
        } else {
          await this.secretStorage.delete(VSCodeConfigRepository.SECRET_KEY);
          await this.secretStorage.delete(VSCodeConfigRepository.LEGACY_SECRET_KEY);
        }
      } catch (error) {
        throw new ConfigError(
          'Failed to save API key securely. Check your system keychain settings.'
        );
      }
    }

    // Update other settings
    const updates: Array<Thenable<void>> = [];

    if (partialConfig.transcriptionLanguage !== undefined) {
      updates.push(
        config.update(
          'transcriptionLanguage',
          partialConfig.transcriptionLanguage,
          vscode.ConfigurationTarget.Global
        )
      );
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
