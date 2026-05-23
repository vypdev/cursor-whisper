import * as vscode from 'vscode';

// Infrastructure
import { VSCodeOutputChannelLogger } from './infrastructure/logging/VSCodeOutputChannelLogger';
import { VSCodeConfigRepository } from './infrastructure/configuration/VSCodeConfigRepository';
import { OpenAIWhisperService } from './infrastructure/transcription/OpenAIWhisperService';
import { OpenAIPromptTransformer } from './infrastructure/transformation/OpenAIPromptTransformer';
import { ChatParticipantInserter } from './infrastructure/insertion/ChatParticipantInserter';
import { EditorTextInserter } from './infrastructure/insertion/EditorTextInserter';
import { FallbackTextInserter } from './infrastructure/insertion/FallbackTextInserter';
import { NativeAudioRecorder } from './infrastructure/audio/NativeAudioRecorder';

// Use Cases
import { StartRecordingUseCase } from './application/use-cases/StartRecordingUseCase';
import { StopRecordingUseCase } from './application/use-cases/StopRecordingUseCase';
import { CancelRecordingUseCase } from './application/use-cases/CancelRecordingUseCase';
import { TranscribeAudioUseCase } from './application/use-cases/TranscribeAudioUseCase';
import { TransformPromptUseCase } from './application/use-cases/TransformPromptUseCase';
import { InsertTextUseCase } from './application/use-cases/InsertTextUseCase';

// Presentation
import { registerStartRecordingCommand } from './presentation/commands/StartRecordingCommand';
import { registerStopRecordingCommand } from './presentation/commands/StopRecordingCommand';
import { registerCancelRecordingCommand } from './presentation/commands/CancelRecordingCommand';
import { registerConfigureApiKeyCommand } from './presentation/commands/ConfigureApiKeyCommand';
import { RecordingStatusBarItem } from './presentation/ui/RecordingStatusBarItem';

/**
 * Main extension entry point.
 * Composition root - all dependencies are wired here.
 */
export function activate(context: vscode.ExtensionContext): void {
  console.log('Cursor Whisper extension is activating...');

  // ========================================
  // INFRASTRUCTURE LAYER
  // ========================================

  // Logging
  const logger = new VSCodeOutputChannelLogger('Cursor Whisper');
  logger.info('Extension activated');

  // Configuration
  const configRepository = new VSCodeConfigRepository(context, context.secrets);

  // Audio Recording (NativeAudioRecorder)
  const audioRecorder = new NativeAudioRecorder(logger);
  logger.info('NativeAudioRecorder initialized');

  // OpenAI Services
  const getApiKey = async (): Promise<string | undefined> => {
    const config = await configRepository.getConfig();
    return config.apiKey;
  };

  const whisperService = new OpenAIWhisperService(getApiKey, logger);
  const promptTransformer = new OpenAIPromptTransformer(getApiKey, logger);

  // Text Insertion (Chain of Responsibility)
  const inserters = [
    new ChatParticipantInserter(logger),
    new EditorTextInserter(logger),
    new FallbackTextInserter(logger),
  ];

  // ========================================
  // APPLICATION LAYER (Use Cases)
  // ========================================

  const startRecordingUseCase = new StartRecordingUseCase(
    audioRecorder,
    configRepository,
    logger
  );

  const stopRecordingUseCase = new StopRecordingUseCase(audioRecorder, logger);

  const cancelRecordingUseCase = new CancelRecordingUseCase(audioRecorder, logger);

  const transcribeUseCase = new TranscribeAudioUseCase(
    whisperService,
    configRepository,
    logger
  );

  const transformUseCase = new TransformPromptUseCase(
    promptTransformer,
    configRepository,
    logger
  );

  const insertUseCase = new InsertTextUseCase(inserters, logger);

  // ========================================
  // PRESENTATION LAYER
  // ========================================

  // Status Bar
  const statusBar = new RecordingStatusBarItem();
  context.subscriptions.push(statusBar);

  // Sync status bar with recorder state
  audioRecorder.onStateChange(state => {
    statusBar.setState(state);
  });

  // Commands
  const startCommand = registerStartRecordingCommand(context, startRecordingUseCase);
  const stopCommand = registerStopRecordingCommand(context, {
    stopRecordingUseCase,
    transcribeUseCase,
    transformUseCase,
    insertUseCase,
  });
  const cancelCommand = registerCancelRecordingCommand(context, cancelRecordingUseCase);
  const configureCommand = registerConfigureApiKeyCommand(context, configRepository);

  context.subscriptions.push(startCommand, stopCommand, cancelCommand, configureCommand);

  // ========================================
  // STARTUP CHECKS
  // ========================================

  // Check if API key is configured
  void configRepository.getConfig().then(config => {
    if (!config.apiKey) {
      logger.warn('OpenAI API Key not configured');
      void vscode.window
        .showWarningMessage(
          'Cursor Whisper: OpenAI API Key not configured',
          'Configure Now',
          'Later'
        )
        .then(selection => {
          if (selection === 'Configure Now') {
            void vscode.commands.executeCommand('cursor-whisper.configureApiKey');
          }
        });
    } else {
      logger.info('Configuration loaded successfully');
    }
  });

  logger.info('Cursor Whisper extension fully activated');
  console.log('✨ Cursor Whisper is ready!');
}

/**
 * Extension deactivation.
 * Clean up resources.
 */
export function deactivate(): void {
  console.log('Cursor Whisper extension is now deactivated');
}
