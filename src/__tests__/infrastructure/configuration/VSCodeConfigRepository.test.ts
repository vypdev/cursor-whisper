import * as vscode from 'vscode';
import { VSCodeConfigRepository } from '../../../infrastructure/configuration/VSCodeConfigRepository';
import { TransformationProvider } from '../../../domain/value-objects/TransformationProvider';

function createSecretStorage(): vscode.SecretStorage {
  const secrets = new Map<string, string>();

  return {
    get: jest.fn(async (key: string) => secrets.get(key)),
    store: jest.fn(async (key: string, value: string) => {
      secrets.set(key, value);
    }),
    delete: jest.fn(async (key: string) => {
      secrets.delete(key);
    }),
    onDidChange: jest.fn(),
  } as unknown as vscode.SecretStorage;
}

describe('VSCodeConfigRepository', () => {
  it('notifies onConfigChange listeners when setProviderApiKey stores a key', async () => {
    const secretStorage = createSecretStorage();
    const repo = new VSCodeConfigRepository({} as vscode.ExtensionContext, secretStorage);
    const callback = jest.fn();

    repo.onConfigChange(callback);
    await repo.setProviderApiKey(TransformationProvider.OpenAI, 'sk-test-key');

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(expect.objectContaining({ apiKey: 'sk-test-key' }));
  });

  it('notifies onConfigChange listeners when setProviderApiKey deletes a key', async () => {
    const secretStorage = createSecretStorage();
    const repo = new VSCodeConfigRepository({} as vscode.ExtensionContext, secretStorage);
    const callback = jest.fn();

    await repo.setProviderApiKey(TransformationProvider.Anthropic, 'anthropic-key');
    callback.mockClear();

    repo.onConfigChange(callback);
    await repo.setProviderApiKey(TransformationProvider.Anthropic, undefined);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(expect.objectContaining({ apiKey: undefined }));
  });
});
