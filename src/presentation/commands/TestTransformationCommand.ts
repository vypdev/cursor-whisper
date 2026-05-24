import * as vscode from 'vscode';
import { IPromptTransformer } from '../../application/ports/IPromptTransformer';
import { IConfigRepository } from '../../application/ports/IConfigRepository';
import { ILogger } from '../../application/ports/ILogger';
import { OpenAIModelService } from '../../infrastructure/openai/OpenAIModelService';
import { PROVIDER_METADATA } from '../../domain/value-objects/TransformationProvider';
import { testOpenAiApiKey } from '../setup/providerConfigurationFlow';
import { WHISPER_COST_NOTE } from '../../shared/constants/providerComparison';

const SAMPLE_TRANSCRIPTION =
  'So um I need to like refactor the auth service to use JWT tokens instead of sessions and we should keep backward compatibility for about six months and also add unit tests for the validation logic';

export function registerTestTransformationCommand(
  _context: vscode.ExtensionContext,
  promptTransformer: IPromptTransformer,
  configRepo: IConfigRepository,
  modelService: OpenAIModelService,
  logger: ILogger
): vscode.Disposable {
  return vscode.commands.registerCommand('cursor-whisper.testTransformation', async () => {
    const config = await configRepo.getConfig();
    const providerMeta = PROVIDER_METADATA[config.transformationProvider];

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Testing Cursor Whisper configuration...',
        cancellable: false,
      },
      async () => {
        const whisperTest = await testOpenAiApiKey(modelService);
        const whisperStatus = whisperTest.ok
          ? 'Whisper (OpenAI): Working'
          : `Whisper (OpenAI): Failed — ${whisperTest.message}`;

        if (!config.enablePromptTransformation) {
          const detail = whisperTest.ok
            ? 'Prompt optimization is disabled. Only Whisper transcription was tested.'
            : 'Configure your OpenAI API key for Whisper transcription.';
          await vscode.window.showInformationMessage(whisperStatus, { detail });
          return;
        }

        if (!whisperTest.ok) {
          await vscode.window.showErrorMessage(whisperStatus, {
            detail: 'Fix your OpenAI API key before testing prompt optimization.',
          });
          return;
        }

        try {
          const result = await promptTransformer.transform(SAMPLE_TRANSCRIPTION, {
            editorLanguage: 'typescript',
            projectType: 'Node.js/JavaScript',
          });

          const panel = vscode.window.createWebviewPanel(
            'cursorWhisperTestTransformation',
            'Cursor Whisper: Configuration Test',
            vscode.ViewColumn.One,
            { enableScripts: false }
          );

          panel.webview.html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Configuration Test</title>
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
    .ok { color: var(--vscode-testing-iconPassed); }
  </style>
</head>
<body>
  <h1>Configuration Test Result</h1>
  <p class="meta ok">✓ ${escapeHtml(whisperStatus)}</p>
  <p class="meta ok">✓ Optimization (${escapeHtml(providerMeta.displayName)}): Working</p>
  <p class="meta">Estimated Whisper cost: ${escapeHtml(WHISPER_COST_NOTE)}. Optimization test used sample text only.</p>
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

          logger.info('Configuration test completed', {
            whisper: whisperTest.ok,
            provider: config.transformationProvider,
            improvements: result.improvements.length,
          });

          await vscode.window.showInformationMessage(
            `✓ Whisper: Working | ✓ Optimization (${providerMeta.displayName}): Working`
          );
        } catch (error) {
          await vscode.window
            .showErrorMessage(
              `✓ Whisper: Working | ✗ Optimization (${providerMeta.displayName}): Failed — ${
                error instanceof Error ? error.message : 'Unknown error'
              }`,
              'Configure Provider',
              'Troubleshooting'
            )
            .then(async selection => {
              if (selection === 'Configure Provider') {
                await vscode.commands.executeCommand('cursor-whisper.openConfigurationPanel');
              } else if (selection === 'Troubleshooting') {
                await vscode.env.openExternal(
                  vscode.Uri.parse(
                    'https://github.com/vypdev/cursor-whisper/blob/main/docs/quickstart.md#troubleshooting'
                  )
                );
              }
            });
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
