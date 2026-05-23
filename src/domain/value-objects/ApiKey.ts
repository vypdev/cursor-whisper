export class ApiKey {
  private readonly value: string;

  constructor(key: string) {
    this.validate(key);
    this.value = key;
  }

  private validate(key: string): void {
    if (!key || key.trim().length === 0) {
      throw new Error('API key cannot be empty');
    }

    if (!key.startsWith('sk-')) {
      throw new Error('API key must start with sk-');
    }

    if (key.length < 20) {
      throw new Error('API key seems too short');
    }
  }

  toString(): string {
    return this.value;
  }

  getMasked(): string {
    return `${this.value.substring(0, 7)}...${this.value.substring(this.value.length - 4)}`;
  }

  equals(other: ApiKey): boolean {
    return this.value === other.value;
  }
}
