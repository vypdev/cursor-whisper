import { ITextInserter } from '../ports/ITextInserter';
import { ILogger } from '../ports/ILogger';

export class InsertionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InsertionError';
  }
}

export class InsertTextUseCase {
  private readonly sortedInserters: ITextInserter[];

  constructor(
    inserters: ITextInserter[],
    private readonly logger: ILogger
  ) {
    // Copy before sort to avoid mutating the caller's array
    this.sortedInserters = [...inserters].sort((a, b) => a.getPriority() - b.getPriority());
  }

  async execute(text: string): Promise<void> {
    this.logger.info('Starting text insertion', {
      textLength: text.length,
      insertersCount: this.sortedInserters.length,
    });

    // Try each inserter in priority order
    for (const inserter of this.sortedInserters) {
      if (inserter.canInsert()) {
        try {
          this.logger.debug(`Trying inserter: ${inserter.constructor.name}`, {
            canInsert: inserter.canInsert(),
            priority: inserter.getPriority(),
          });
          const success = await inserter.insert(text);

          if (success) {
            this.logger.info(`Text inserted successfully using ${inserter.constructor.name}`, {
              textLength: text.length,
              inserterType: inserter.constructor.name,
            });
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
