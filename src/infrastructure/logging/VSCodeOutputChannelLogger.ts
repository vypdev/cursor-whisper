import * as vscode from 'vscode';
import { ILogger, LogLevel } from '../../application/ports/ILogger';

export class VSCodeOutputChannelLogger implements ILogger {
  private level: LogLevel = LogLevel.INFO;
  private outputChannel: vscode.OutputChannel;

  constructor(channelName: string = 'Cursor Whisper') {
    this.outputChannel = vscode.window.createOutputChannel(channelName);
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  debug(message: string, data?: unknown): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      this.log('DEBUG', message, data);
    }
  }

  info(message: string, data?: unknown): void {
    if (this.shouldLog(LogLevel.INFO)) {
      this.log('INFO', message, data);
    }
  }

  warn(message: string, data?: unknown): void {
    if (this.shouldLog(LogLevel.WARN)) {
      this.log('WARN', message, data);
    }
  }

  error(message: string, error?: Error): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      this.log('ERROR', message, error);
      if (error?.stack) {
        this.outputChannel.appendLine(error.stack);
      }
    }
  }

  private log(level: string, message: string, data?: unknown): void {
    const timestamp = new Date().toISOString();
    const dataStr = data ? ` ${JSON.stringify(data)}` : '';
    this.outputChannel.appendLine(`[${timestamp}] [${level}] ${message}${dataStr}`);
  }

  private shouldLog(messageLevel: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const currentLevelIndex = levels.indexOf(this.level);
    const messageLevelIndex = levels.indexOf(messageLevel);
    return messageLevelIndex >= currentLevelIndex;
  }

  dispose(): void {
    this.outputChannel.dispose();
  }
}
