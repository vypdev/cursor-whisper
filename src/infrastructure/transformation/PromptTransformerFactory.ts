import { TransformedPrompt } from '../../application/dto/TransformedPrompt';
import { IPromptTransformer } from '../../application/ports/IPromptTransformer';
import { ITransformationProviderValidator } from '../../application/ports/ITransformationProviderValidator';
import { IConfigRepository } from '../../application/ports/IConfigRepository';
import { ILogger } from '../../application/ports/ILogger';
import {
  TransformationProvider,
  PROVIDER_METADATA,
} from '../../domain/value-objects/TransformationProvider';
import { OpenAIPromptTransformer } from './OpenAIPromptTransformer';
import { AnthropicPromptTransformer } from './AnthropicPromptTransformer';
import { GooglePromptTransformer } from './GooglePromptTransformer';
import { AzureOpenAIPromptTransformer } from './AzureOpenAIPromptTransformer';
import { OllamaPromptTransformer } from './OllamaPromptTransformer';
import { OpenCodePromptTransformer } from './OpenCodePromptTransformer';
import { OpenRouterPromptTransformer } from './OpenRouterPromptTransformer';
import { TransformationError, getSystemPrompt } from './transformationUtils';

export class PromptTransformerFactory implements ITransformationProviderValidator {
  constructor(
    private readonly configRepo: IConfigRepository,
    private readonly logger: ILogger
  ) {}

  async create(): Promise<IPromptTransformer> {
    const config = await this.configRepo.getConfig();
    return this.createForProvider(config.transformationProvider);
  }

  createForProvider(provider: TransformationProvider): IPromptTransformer {
    const resolveSystemPrompt = () =>
      this.configRepo.getConfig().then(config => getSystemPrompt(config));

    switch (provider) {
      case TransformationProvider.OpenAI:
        return new OpenAIPromptTransformer(
          () => this.configRepo.getProviderApiKey(TransformationProvider.OpenAI),
          () => this.configRepo.getConfig().then(c => c.transformationModel),
          resolveSystemPrompt,
          this.logger
        );

      case TransformationProvider.Anthropic:
        return new AnthropicPromptTransformer(
          () => this.configRepo.getProviderApiKey(TransformationProvider.Anthropic),
          () => this.configRepo.getConfig().then(c => c.anthropicModel),
          resolveSystemPrompt,
          this.logger
        );

      case TransformationProvider.Google:
        return new GooglePromptTransformer(
          () => this.configRepo.getProviderApiKey(TransformationProvider.Google),
          () => this.configRepo.getConfig().then(c => c.googleModel),
          resolveSystemPrompt,
          this.logger
        );

      case TransformationProvider.Azure:
        return new AzureOpenAIPromptTransformer(
          () => this.configRepo.getProviderApiKey(TransformationProvider.Azure),
          async () => {
            const config = await this.configRepo.getConfig();
            return {
              endpoint: config.azureEndpoint,
              deployment: config.azureDeployment,
            };
          },
          resolveSystemPrompt,
          this.logger
        );

      case TransformationProvider.Ollama:
        return new OllamaPromptTransformer(
          async () => {
            const config = await this.configRepo.getConfig();
            return {
              baseUrl: config.ollamaBaseUrl,
              model: config.ollamaModel,
            };
          },
          resolveSystemPrompt,
          this.logger
        );

      case TransformationProvider.OpenCode:
        return new OpenCodePromptTransformer(
          async () => {
            const config = await this.configRepo.getConfig();
            return {
              baseUrl: config.openCodeBaseUrl,
              model: config.openCodeModel,
            };
          },
          () => this.configRepo.getProviderApiKey(TransformationProvider.OpenCode),
          resolveSystemPrompt,
          this.logger
        );

      case TransformationProvider.OpenRouter:
        return new OpenRouterPromptTransformer(
          () => this.configRepo.getProviderApiKey(TransformationProvider.OpenRouter),
          () => this.configRepo.getConfig().then(c => c.openRouterModel),
          resolveSystemPrompt,
          this.logger
        );

      default: {
        const exhaustiveCheck: never = provider;
        throw new TransformationError(
          `Unsupported transformation provider: ${String(exhaustiveCheck)}`
        );
      }
    }
  }

  async validateProvider(provider: TransformationProvider): Promise<string | undefined> {
    const metadata = PROVIDER_METADATA[provider];

    if (metadata.requiresApiKey) {
      const apiKey = await this.configRepo.getProviderApiKey(provider);
      if (!apiKey) {
        return `${metadata.displayName} API key is not configured.`;
      }
    }

    if (provider === TransformationProvider.Azure) {
      const config = await this.configRepo.getConfig();
      if (!config.azureEndpoint.trim()) {
        return 'Azure OpenAI endpoint is not configured.';
      }
      if (!config.azureDeployment.trim()) {
        return 'Azure OpenAI deployment name is not configured.';
      }
    }

    if (provider === TransformationProvider.Ollama) {
      const available = await OllamaPromptTransformer.isAvailable(
        (await this.configRepo.getConfig()).ollamaBaseUrl
      );
      if (!available) {
        return 'Ollama server is not reachable. Ensure Ollama is running locally.';
      }
    }

    if (provider === TransformationProvider.OpenCode) {
      const config = await this.configRepo.getConfig();
      if (!config.openCodeBaseUrl.trim()) {
        return 'OpenCode proxy base URL is not configured.';
      }
      if (!config.openCodeModel.trim()) {
        return 'OpenCode model is not configured.';
      }
      const apiKey = await this.configRepo.getProviderApiKey(TransformationProvider.OpenCode);
      const available = await OpenCodePromptTransformer.isAvailable(
        config.openCodeBaseUrl,
        apiKey
      );
      if (!available) {
        return 'OpenCode proxy is not reachable. Ensure opencode-llm-proxy is installed and running.';
      }
    }

    return undefined;
  }
}

/**
 * Resolves the active prompt transformer from configuration on each call.
 */
export class ConfigurablePromptTransformer implements IPromptTransformer {
  constructor(private readonly factory: PromptTransformerFactory) {}

  async transform(
    transcription: string,
    context?: import('../../application/ports/IPromptTransformer').PromptContext
  ): Promise<TransformedPrompt> {
    const transformer = await this.factory.create();
    return transformer.transform(transcription, context);
  }
}
