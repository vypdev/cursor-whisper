import * as vscode from 'vscode';
import { IConfigRepository } from '../../application/ports/IConfigRepository';
import { ApiKey } from '../../domain/value-objects/ApiKey';

export function registerConfigureApiKeyCommand(
  _context: vscode.ExtensionContext,
  configRepo: IConfigRepository
): vscode.Disposable {
  return vscode.commands.registerCommand('cursor-whisper.configureApiKey', async () => {
    const apiKey = await vscode.window.showInputBox({
      prompt: 'Enter your OpenAI API Key',
      password: true,
      placeHolder: 'sk-...',
      validateInput: value => {
        try {
          new ApiKey(value);
          return null;
        } catch (error) {
          return error instanceof Error ? error.message : 'Invalid API key';
        }
      },
    });

    if (apiKey) {
      try {
        await configRepo.updateConfig({ apiKey });
        await vscode.window.showInformationMessage('API Key configured successfully');
      } catch (error) {
        await vscode.window.showErrorMessage(
          `Failed to save API Key: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
  });
}
