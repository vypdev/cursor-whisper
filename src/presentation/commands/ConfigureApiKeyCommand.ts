import * as vscode from 'vscode';
import { IConfigRepository } from '../../application/ports/IConfigRepository';
import { ApiKey } from '../../domain/value-objects/ApiKey';
import {
  OPENAI_API_KEY_DETAIL,
  OPENAI_API_KEY_PROMPT,
  OPENAI_API_KEY_SUCCESS,
} from '../../shared/constants/uxMessages';

export function registerConfigureApiKeyCommand(
  _context: vscode.ExtensionContext,
  configRepo: IConfigRepository
): vscode.Disposable {
  return vscode.commands.registerCommand('promptimize.configureApiKey', async () => {
    const apiKey = await vscode.window.showInputBox({
      title: 'Configure OpenAI API Key (Required for Whisper)',
      prompt: OPENAI_API_KEY_PROMPT,
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
        await vscode.window.showInformationMessage(OPENAI_API_KEY_SUCCESS, {
          detail: OPENAI_API_KEY_DETAIL,
        });
      } catch (error) {
        await vscode.window.showErrorMessage(
          `Failed to save OpenAI API key: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
  });
}
