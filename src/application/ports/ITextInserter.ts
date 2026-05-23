/**
 * Port for text insertion functionality.
 *
 * Implementations (in priority order):
 * - ChatParticipantInserter: Insert into Cursor chat
 * - EditorTextInserter: Insert into active editor
 * - FallbackTextInserter: Copy to clipboard + notify
 */
export interface ITextInserter {
  /**
   * Check if this inserter can handle current context.
   *
   * @returns true if can insert in current context
   */
  canInsert(): boolean;

  /**
   * Insert text using this strategy.
   *
   * @param text Text to insert
   * @returns true if successful
   * @throws InsertionError if insertion fails
   */
  insert(text: string): Promise<boolean>;

  /**
   * Get priority of this inserter.
   * Higher priority inserters are tried first.
   *
   * @returns Priority number (1 = highest)
   */
  getPriority(): number;
}
