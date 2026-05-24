/** User-facing copy that separates Whisper transcription from prompt optimization. */

export const WHISPER_SERVICE_NAME = 'OpenAI Whisper';
export const WHISPER_SERVICE_DESCRIPTION =
  'Voice-to-text transcription always uses OpenAI Whisper and requires an OpenAI API key.';

export const OPTIMIZATION_SERVICE_DESCRIPTION =
  'Prompt optimization is optional. Choose a provider and supply its API key or credentials when required.';

export const OPENAI_API_KEY_PROMPT =
  'Enter your OpenAI API key for Whisper voice-to-text transcription.';

export const OPENAI_API_KEY_DETAIL =
  'If you choose OpenAI for prompt optimization, the same key can be reused. Get a key at https://platform.openai.com/api-keys';

export const OPENAI_API_KEY_SUCCESS =
  'OpenAI API key saved. Whisper transcription is ready. You can reuse this key for OpenAI prompt optimization.';

export const OPENAI_API_KEY_REQUIRED_RECORDING =
  'OpenAI API key is required for voice-to-text transcription (Whisper). Prompt optimization uses a separate provider you can configure later.';

export const OPENAI_API_KEY_REQUIRED_STARTUP =
  'Cursor Whisper: OpenAI API key is required for voice-to-text transcription (Whisper). Run setup to configure your key.';

export const OPTIMIZATION_PROVIDER_INTRO =
  'Prompt optimization turns transcribed speech into structured, LLM-ready prompts. This step is separate from Whisper transcription.';

export const OPTIMIZATION_PROVIDER_INTRO_DETAIL =
  'Transcription always uses OpenAI Whisper. Select a provider below and provide its API key or credentials when prompted.';

export const OPTIMIZATION_PROVIDER_MISSING_KEY = (providerName: string): string =>
  `Cursor Whisper: ${providerName} credentials are not configured for prompt optimization.`;

export const STATUS_BAR_SERVICES_TOOLTIP = (
  optimizationProvider: string,
  optimizationEnabled: boolean
): string => {
  const optimizationLine = optimizationEnabled
    ? `Optimization: ${optimizationProvider}`
    : 'Optimization: disabled (raw transcription only)';
  return `Transcription: ${WHISPER_SERVICE_NAME}\n${optimizationLine}\n\nClick to start recording (Cmd/Ctrl+Alt+V)\nRun "Cursor Whisper: Open Configuration" to change settings`;
};

export const SETUP_CHECKLIST_TOOLTIP = (
  items: Array<{ label: string; complete: boolean }>
): string => {
  const lines = items.map(item => `${item.complete ? '✓' : '✗'} ${item.label}`);
  return `Setup checklist:\n${lines.join('\n')}\n\nClick to open configuration`;
};
