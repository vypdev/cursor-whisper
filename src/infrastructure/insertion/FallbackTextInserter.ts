import * as vscode from 'vscode';
import { ITextInserter } from '../../application/ports/ITextInserter';

export class FallbackTextInserter implements ITextInserter {
  canInsert(): boolean {
    return true; // Always available as fallback
  }

  async insert(text: string): Promise<boolean> {
    try {
      // Copy to clipboard
      await vscode.env.clipboard.writeText(text);

      // Notify user
      await vscode.window.showInformationMessage(
        'Prompt copied to clipboard. Paste it where needed.',
        'OK'
      );

      return true;
    } catch (error) {
      return false;
    }
  }

  getPriority(): number {
    return 3; // Lowest priority (last resort)
  }
}
