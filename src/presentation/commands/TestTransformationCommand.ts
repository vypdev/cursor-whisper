import * as vscode from 'vscode';
import { IPromptTransformer } from '../../application/ports/IPromptTransformer';
import { IConfigRepository } from '../../application/ports/IConfigRepository';
import { ILogger } from '../../application/ports/ILogger';
import { PROVIDER_METADATA } from '../../domain/value-objects/TransformationProvider';

const SAMPLE_TRANSCRIPTION =
  'So um I need to like refactor the auth service to use JWT tokens instead of sessions and we should keep backward compatibility for about six months and also add unit tests for the validation logic';

export function registerTestTransformationCommand(
  _context: vscode.ExtensionContext,
  promptTransformer: IPromptTransformer,
  configRepo: IConfigRepository,
  logger: ILogger
): vscode.Disposable {
  return vscode.commands.registerCommand('cursor-whisper.testTransformation', async () => {
    const config = await configRepo.getConfig();

    if (!config.enablePromptTransformation) {
      const enable = await vscode.window.showWarningMessage(
        'Prompt transformation is disabled. Enable it in settings to run a test.',
        'Open Settings'
      );
      if (enable === 'Open Settings') {
        await vscode.commands.executeCommand(
          'workbench.action.openSettings',
          'cursorWhisper.enablePromptTransformation'
        );
      }
      return;
    }

    const providerMeta = PROVIDER_METADATA[config.transformationProvider];

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Testing transformation with ${providerMeta.displayName}...`,
        cancellable: false,
      },
      async () => {
        try {
          const result = await promptTransformer.transform(SAMPLE_TRANSCRIPTION, {
            editorLanguage: 'typescript',
            projectType: 'Node.js/JavaScript',
          });

          const panel = vscode.window.createWebviewPanel(
            'cursorWhisperTestTransformation',
            'Cursor Whisper: Transformation Test',
            vscode.ViewColumn.One,
            { enableScripts: false }
          );

          panel.webview.html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Transformation Test</title>
  <style>
    body { font-family: var(--vscode-font-family); padding: 16px; color: var(--vscode-foreground); }
    h2 { margin-top: 24px; }
    pre {
      white-space: pre-wrap;
      background: var(--vscode-textBlockQuote-background);
      border: 1px solid var(--vscode-panel-border);
      padding: 12px;
      border-radius: 4px;
    }
    .meta { color: var(--vscode-descriptionForeground); margin-bottom: 16px; }
    ul { padding-left: 20px; }
  </style>
</head>
<body>
  <h1>Transformation Test Result</h1>
  <p class="meta">Provider: ${providerMeta.displayName}</p>
  <h2>Original</h2>
  <pre>${escapeHtml(result.originalText)}</pre>
  <h2>Transformed</h2>
  <pre>${escapeHtml(result.transformedText)}</pre>
  ${
    result.improvements.length > 0
      ? `<h2>Improvements</h2><ul>${result.improvements.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
      : ''
  }
</body>
</html>`;

          logger.info('Transformation test completed', {
            provider: config.transformationProvider,
            improvements: result.improvements.length,
          });
        } catch (error) {
          await vscode.window.showErrorMessage(
            `Transformation test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }
    );
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
