import * as vscode from 'vscode';
import { ITextInserter } from '../../application/ports/ITextInserter';

export class EditorTextInserter implements ITextInserter {
  canInsert(): boolean {
    return vscode.window.activeTextEditor !== undefined;
  }

  async insert(text: string): Promise<boolean> {
    const editor = vscode.window.activeTextEditor;

    if (!editor) {
      return false;
    }

    try {
      await editor.edit(editBuilder => {
        const position = editor.selection.active;
        editBuilder.insert(position, text);
      });

      return true;
    } catch (error) {
      return false;
    }
  }

  getPriority(): number {
    return 2; // Medium priority (after chat, before clipboard)
  }
}
