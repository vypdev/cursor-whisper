import * as vscode from 'vscode';

// Infrastructure
import { VSCodeOutputChannelLogger } from './infrastructure/logging/VSCodeOutputChannelLogger';
import { VSCodeConfigRepository } from './infrastructure/configuration/VSCodeConfigRepository';
import { OpenAIWhisperService } from './infrastructure/transcription/OpenAIWhisperService';
import {
  PromptTransformerFactory,
  ConfigurablePromptTransformer,
} from './infrastructure/transformation/PromptTransformerFactory';
import { OpenAIModelService } from './infrastructure/openai/OpenAIModelService';
import { ChatParticipantInserter } from './infrastructure/insertion/ChatParticipantInserter';
import { EditorTextInserter } from './infrastructure/insertion/EditorTextInserter';
import { FallbackTextInserter } from './infrastructure/insertion/FallbackTextInserter';
import { NativeAudioRecorder } from './infrastructure/audio/NativeAudioRecorder';
import { RecordingState } from './domain/value-objects/RecordingState';

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
import { registerStartTranscribeRecordingCommand } from './presentation/commands/StartTranscribeRecordingCommand';
import { registerStopTranscribeRecordingCommand } from './presentation/commands/StopTranscribeRecordingCommand';
import { registerStartPromptimizeRecordingCommand } from './presentation/commands/StartPromptimizeRecordingCommand';
import { registerStopPromptimizeRecordingCommand } from './presentation/commands/StopPromptimizeRecordingCommand';
import { registerCancelRecordingCommand } from './presentation/commands/CancelRecordingCommand';
import { registerConfigureApiKeyCommand } from './presentation/commands/ConfigureApiKeyCommand';
import { registerConfigureModelCommand } from './presentation/commands/ConfigureModelCommand';
import { registerConfigureTransformationProviderCommand } from './presentation/commands/ConfigureTransformationProviderCommand';
import { registerTestTransformationCommand } from './presentation/commands/TestTransformationCommand';
import {
  getSetupChecklist,
  registerFirstTimeSetupCommand,
} from './presentation/commands/FirstTimeSetupCommand';
import { registerOpenConfigurationPanelCommand } from './presentation/commands/OpenConfigurationPanelCommand';
import { RecordingStatusBarItem } from './presentation/ui/RecordingStatusBarItem';
import { validateConfigurationOnStartup } from './application/services/ConfigurationValidationService';
import {
  PROVIDER_METADATA,
  TransformationProvider,
} from './domain/value-objects/TransformationProvider';

let activeAudioRecorder: NativeAudioRecorder | null = null;

/**
 * Main extension entry point.
 * Composition root - all dependencies are wired here.
 */
export function activate(context: vscode.ExtensionContext): void {
  // ========================================
  // INFRASTRUCTURE LAYER
  // ========================================

  // Logging
  const logger = new VSCodeOutputChannelLogger('Cursor Whisper');
  logger.info('Cursor Whisper extension is activating...');

  // Configuration
  const configRepository = new VSCodeConfigRepository(context, context.secrets);

  // Audio Recording (NativeAudioRecorder)
  const audioRecorder = new NativeAudioRecorder(logger);
  activeAudioRecorder = audioRecorder;
  logger.info('NativeAudioRecorder initialized');

  // OpenAI Services
  const getApiKey = async (): Promise<string | undefined> => {
    const config = await configRepository.getConfig();
    return config.apiKey;
  };

  const whisperService = new OpenAIWhisperService(getApiKey, logger);
  const transformerFactory = new PromptTransformerFactory(configRepository, logger);
  const promptTransformer = new ConfigurablePromptTransformer(transformerFactory);
  const modelService = new OpenAIModelService(getApiKey, logger);

  // Text Insertion (Chain of Responsibility)
  const inserters = [
    new ChatParticipantInserter(logger),
    new EditorTextInserter(logger),
    new FallbackTextInserter(logger),
  ];

  // ========================================
  // APPLICATION LAYER (Use Cases)
  // ========================================

  const startRecordingUseCase = new StartRecordingUseCase(audioRecorder, logger);

  const stopRecordingUseCase = new StopRecordingUseCase(audioRecorder, logger);

  const cancelRecordingUseCase = new CancelRecordingUseCase(audioRecorder, logger);

  const transcribeUseCase = new TranscribeAudioUseCase(whisperService, configRepository, logger);

  const transformUseCase = new TransformPromptUseCase(
    promptTransformer,
    transformerFactory,
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

  const syncTransformationProviderLabel = async (): Promise<void> => {
    const config = await configRepository.getConfig();
    const metadata = PROVIDER_METADATA[config.transformationProvider];
    statusBar.setTransformationProviderLabel(metadata.displayName);

    const checklist = await getSetupChecklist(configRepository);
    const openAiKey = await configRepository.getProviderApiKey(TransformationProvider.OpenAI);

    statusBar.setSetupState({
      optimizationEnabled: config.enablePromptTransformation,
      hasOpenAIKey: Boolean(openAiKey),
      setupChecklist: checklist,
    });
  };

  void syncTransformationProviderLabel();
  configRepository.onConfigChange(() => {
    void syncTransformationProviderLabel();
  });

  // Sync status bar with recorder state and keybinding context
  audioRecorder.onStateChange(state => {
    statusBar.setState(state);
    void vscode.commands.executeCommand(
      'setContext',
      'cursorWhisper.isRecording',
      state === RecordingState.RECORDING
    );
  });

  // Commands
  const startCommand = registerStartRecordingCommand(
    context,
    configRepository,
    transformerFactory,
    startRecordingUseCase
  );
  const startTranscribeCommand = registerStartTranscribeRecordingCommand(
    context,
    configRepository,
    startRecordingUseCase
  );
  const startPromptimizeCommand = registerStartPromptimizeRecordingCommand(
    context,
    configRepository,
    transformerFactory,
    startRecordingUseCase
  );
  const stopCommand = registerStopRecordingCommand(context);
  const stopTranscribeCommand = registerStopTranscribeRecordingCommand(context, {
    stopRecordingUseCase,
    transcribeUseCase,
    insertUseCase,
  });
  const stopPromptimizeCommand = registerStopPromptimizeRecordingCommand(context, {
    stopRecordingUseCase,
    transcribeUseCase,
    transformUseCase,
    insertUseCase,
  });
  const cancelCommand = registerCancelRecordingCommand(context, cancelRecordingUseCase);
  const configureCommand = registerConfigureApiKeyCommand(context, configRepository);
  const configureModelCommand = registerConfigureModelCommand(
    context,
    configRepository,
    modelService,
    transformerFactory,
    logger
  );
  const configureProviderCommand = registerConfigureTransformationProviderCommand(
    context,
    configRepository,
    transformerFactory,
    modelService,
    logger
  );
  const testTransformationCommand = registerTestTransformationCommand(
    context,
    promptTransformer,
    configRepository,
    modelService,
    logger
  );
  const firstTimeSetupCommand = registerFirstTimeSetupCommand(
    context,
    configRepository,
    transformerFactory,
    modelService,
    promptTransformer,
    logger
  );
  const openConfigurationPanelCommand = registerOpenConfigurationPanelCommand(
    context,
    configRepository,
    transformerFactory,
    modelService,
    promptTransformer,
    logger
  );

  context.subscriptions.push(
    startCommand,
    startTranscribeCommand,
    startPromptimizeCommand,
    stopCommand,
    stopTranscribeCommand,
    stopPromptimizeCommand,
    cancelCommand,
    configureCommand,
    configureModelCommand,
    configureProviderCommand,
    testTransformationCommand,
    firstTimeSetupCommand,
    openConfigurationPanelCommand
  );

  // ========================================
  // STARTUP CHECKS
  // ========================================

  void validateConfigurationOnStartup(configRepository, transformerFactory).then(async issue => {
    if (issue) {
      logger.warn(issue.message);
      const selection = await vscode.window.showWarningMessage(
        issue.message,
        'Configure Now',
        'Open Configuration',
        'Later'
      );
      if (selection === 'Configure Now') {
        await vscode.commands.executeCommand(issue.configureCommand);
      } else if (selection === 'Open Configuration') {
        await vscode.commands.executeCommand('cursor-whisper.openConfigurationPanel');
      }
      return;
    }

    logger.info('Configuration loaded successfully');
  });

  logger.info('Cursor Whisper extension fully activated');
  logger.info('Cursor Whisper is ready');
}

/**
 * Extension deactivation.
 * Clean up resources.
 */
export function deactivate(): void {
  activeAudioRecorder?.dispose();
  activeAudioRecorder = null;
}
