import { ITextInserter } from '../ports/ITextInserter';
import { ILogger } from '../ports/ILogger';

export class InsertionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InsertionError';
  }
}

export class InsertTextUseCase {
  constructor(
    private readonly inserters: ITextInserter[],
    private readonly logger: ILogger
  ) {
    // Sort inserters by priority (highest first)
    this.inserters.sort((a, b) => a.getPriority() - b.getPriority());
  }

  async execute(text: string): Promise<void> {
    this.logger.info('Starting text insertion', {
      textLength: text.length,
      insertersCount: this.inserters.length,
    });

    // Try each inserter in priority order
    for (const inserter of this.inserters) {
      if (inserter.canInsert()) {
        try {
          this.logger.debug(`Trying inserter: ${inserter.constructor.name}`);
          const success = await inserter.insert(text);

          if (success) {
            this.logger.info(`Text inserted successfully using ${inserter.constructor.name}`);
            return;
          }
        } catch (error) {
          this.logger.warn(
            `Inserter ${inserter.constructor.name} failed, trying next`,
            error as Error
          );
          continue;
        }
      } else {
        this.logger.debug(`Inserter ${inserter.constructor.name} cannot insert in current context`);
      }
    }

    // All inserters failed
    throw new InsertionError('All text insertion strategies failed');
  }
}
