import { ILogger } from '../../application/ports/ILogger';

export function createMockLogger(): ILogger {
  return {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    setLevel: jest.fn(),
  };
}
