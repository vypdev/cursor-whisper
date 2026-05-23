import * as vscode from 'vscode';
import { IConfigRepository, Config } from '../../application/ports/IConfigRepository';

export class VSCodeConfigRepository implements IConfigRepository {
  private static readonly SECTION = 'cursorWhisper';
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

    // Get API key from secure storage
    const apiKey = await this.secretStorage.get('openai-api-key');

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
      if (partialConfig.apiKey) {
        await this.secretStorage.store('openai-api-key', partialConfig.apiKey);
      } else {
        await this.secretStorage.delete('openai-api-key');
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
