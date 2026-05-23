import * as vscode from 'vscode';
import { ITextInserter } from '../../application/ports/ITextInserter';
import { ILogger } from '../../application/ports/ILogger';

export class FallbackTextInserter implements ITextInserter {
  constructor(private readonly logger?: ILogger) {}

  canInsert(): boolean {
    return true; // Always available as fallback
  }

  async insert(text: string): Promise<boolean> {
    this.logger?.info('FallbackTextInserter: Using clipboard fallback', {
      textLength: text.length,
    });

    try {
      await vscode.env.clipboard.writeText(text);
      this.logger?.info('FallbackTextInserter: Text copied to clipboard');

      await vscode.window.showInformationMessage(
        'Prompt copied to clipboard. Paste it where needed.',
        'OK'
      );

      return true;
    } catch (error) {
      this.logger?.error('FallbackTextInserter: Clipboard failed', error as Error);
      return false;
    }
  }

  getPriority(): number {
    return 3; // Lowest priority (last resort)
  }
}
