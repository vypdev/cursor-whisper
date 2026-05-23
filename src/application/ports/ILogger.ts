export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

/**
 * Port for logging functionality.
 *
 * Implementations:
 * - ConsoleLogger: Logs to console
 * - VSCodeOutputChannelLogger: Logs to VSCode output channel
 * - FileLogger (future): Logs to file
 */
export interface ILogger {
  /**
   * Log debug message.
   */
  debug(message: string, data?: unknown): void;

  /**
   * Log info message.
   */
  info(message: string, data?: unknown): void;

  /**
   * Log warning message.
   */
  warn(message: string, data?: unknown): void;

  /**
   * Log error message.
   */
  error(message: string, error?: Error): void;

  /**
   * Set minimum log level.
   */
  setLevel(level: LogLevel): void;
}
