export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

export class MissingApiKeyError extends ConfigError {
  constructor() {
    super('OpenAI API Key not configured');
    this.name = 'MissingApiKeyError';
  }
}

export class InvalidConfigError extends ConfigError {
  constructor(field: string, reason: string) {
    super(`Invalid configuration for ${field}: ${reason}`);
    this.name = 'InvalidConfigError';
  }
}
