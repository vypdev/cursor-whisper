import * as vscode from 'vscode';
import { ITextInserter } from '../../application/ports/ITextInserter';
import { ILogger } from '../../application/ports/ILogger';

/**
 * Inserts text into the active AI chat input (Cursor Composer or VS Code Chat).
 * Tries Cursor-specific commands first, then falls back to the standard chat API.
 */
export class ChatParticipantInserter implements ITextInserter {
  private hasVSCodeChat = false;
  private hasCursorComposer = false;
  private commandsInitialized = false;

  constructor(private readonly logger?: ILogger) {
    void this.initializeAvailableCommands();
  }

  private async initializeAvailableCommands(): Promise<void> {
    try {
      const commands = await vscode.commands.getCommands(true);
      this.hasVSCodeChat = commands.includes('workbench.action.chat.open');
      this.hasCursorComposer = commands.includes('composer.focusComposer');

      this.commandsInitialized = true;

      this.logger?.debug('ChatParticipantInserter: Available chat commands', {
        hasVSCodeChat: this.hasVSCodeChat,
        hasCursorComposer: this.hasCursorComposer,
      });
    } catch (error) {
      this.logger?.warn('ChatParticipantInserter: Failed to detect chat commands', error as Error);
      this.commandsInitialized = true;
    }
  }

  canInsert(): boolean {
    if (!this.commandsInitialized) {
      // Optimistically try while command detection completes
      return true;
    }

    return this.hasVSCodeChat || this.hasCursorComposer;
  }

  async insert(text: string): Promise<boolean> {
    if (!this.commandsInitialized) {
      await this.initializeAvailableCommands();
    }

    this.logger?.debug('ChatParticipantInserter: Inserting text into chat', {
      textLength: text.length,
      hasCursorComposer: this.hasCursorComposer,
      hasVSCodeChat: this.hasVSCodeChat,
    });

    if (this.hasCursorComposer) {
      const cursorSuccess = await this.insertIntoCursorComposer(text);
      if (cursorSuccess) {
        return true;
      }
    }

    if (this.hasVSCodeChat) {
      const chatSuccess = await this.insertIntoVSCodeChat(text);
      if (chatSuccess) {
        return true;
      }
    }

    this.logger?.warn('ChatParticipantInserter: All chat insertion strategies failed');
    return false;
  }

  getPriority(): number {
    return 1;
  }

  private async insertIntoCursorComposer(text: string): Promise<boolean> {
    try {
      await vscode.commands.executeCommand('composer.focusComposer');

      // Small delay to allow focus to settle before pasting
      await this.delay(100);

      const previousClipboard = await vscode.env.clipboard.readText();
      await vscode.env.clipboard.writeText(text);

      try {
        await vscode.commands.executeCommand('editor.action.clipboardPasteAction');
      } finally {
        // Restore previous clipboard content
        await vscode.env.clipboard.writeText(previousClipboard);
      }

      this.logger?.info('ChatParticipantInserter: Text inserted into Cursor Composer');
      return true;
    } catch (error) {
      this.logger?.warn(
        'ChatParticipantInserter: Cursor Composer insertion failed',
        error as Error
      );
      return false;
    }
  }

  private async insertIntoVSCodeChat(text: string): Promise<boolean> {
    try {
      await vscode.commands.executeCommand('workbench.action.chat.open', {
        query: text,
        isPartialQuery: true,
      });

      this.logger?.info('ChatParticipantInserter: Text inserted into VS Code Chat');
      return true;
    } catch (error) {
      this.logger?.warn('ChatParticipantInserter: VS Code Chat insertion failed', error as Error);
      return false;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
