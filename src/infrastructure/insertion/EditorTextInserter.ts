import * as vscode from 'vscode';
import { ITextInserter } from '../../application/ports/ITextInserter';
import { ILogger } from '../../application/ports/ILogger';

export class EditorTextInserter implements ITextInserter {
  constructor(private readonly logger?: ILogger) {}

  canInsert(): boolean {
    const hasEditor = vscode.window.activeTextEditor !== undefined;
    this.logger?.debug('EditorTextInserter.canInsert', { hasEditor });
    return hasEditor;
  }

  async insert(text: string): Promise<boolean> {
    const editor = vscode.window.activeTextEditor;

    if (!editor) {
      this.logger?.warn('EditorTextInserter: No active editor');
      return false;
    }

    this.logger?.debug('EditorTextInserter: Inserting text', {
      documentLanguage: editor.document.languageId,
      cursorPosition: editor.selection.active.line + ':' + editor.selection.active.character,
      textLength: text.length,
    });

    try {
      await editor.edit(editBuilder => {
        const position = editor.selection.active;
        editBuilder.insert(position, text);
      });

      this.logger?.info('EditorTextInserter: Text inserted successfully');
      return true;
    } catch (error) {
      this.logger?.error('EditorTextInserter: Insert failed', error as Error);
      return false;
    }
  }

  getPriority(): number {
    return 2; // Medium priority (after chat, before clipboard)
  }
}
