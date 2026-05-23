# ADR-0011: Use GPT-4 for Prompt Transformation

**Status**: Accepted

**Date**: 2026-05-23

**Deciders**: Core Team

**Related**: [ADR-0003](0003-openai-whisper.md)

---

## Context

After transcribing speech to text, we have raw natural language. However, natural speech often contains:
- Filler words ("um", "uh", "like")
- Repetitions
- Rambling structure
- Unclear requirements
- Mixed concerns

We want to transform this into well-structured prompts that LLMs can better understand and act upon.

Options for transformation:
1. **No transformation** - Use raw transcription
2. **Rule-based cleanup** - Regex/NLP to clean text
3. **Template-based structuring** - Force into templates
4. **LLM-based transformation** - Use AI to restructure

Target output format:
- Structured markdown with sections
- Clear objectives vs requirements vs constraints
- Technical terminology preserved
- Concise but complete
- Actionable

---

## Decision

**We will use GPT-4o for intelligent prompt transformation.**

Key aspects:
- Send raw transcription to GPT-4o
- Use system prompt to guide transformation
- Preserve technical terms and context
- Structure into sections (Context, Objectives, Requirements, Constraints)
- Temperature 0.3 for consistency
- Max 2000 tokens output
- Same OpenAI API as Whisper (single key)
- Optional: User can disable transformation

### System Prompt

```text
You are an assistant specialized in transforming natural speech into structured, optimized prompts for LLMs.

Your task:
1. Analyze the user's spoken input
2. Identify the main intention
3. Structure requirements, objectives, and constraints clearly
4. Remove filler words and repetitions
5. Maintain technical language
6. Separate clearly: context, objective, technical requirements, constraints

Return ONLY the optimized prompt, no explanations.
```

---

## Alternatives Considered

### Alternative 1: No Transformation
- **Description**: Insert raw transcription directly
- **Pros**:
  - Simplest implementation
  - No additional API cost
  - Fastest (no processing)
  - User's exact words preserved
- **Cons**:
  - Raw speech often unclear to LLMs
  - Filler words waste tokens
  - Unstructured prompts get worse results
  - Value proposition reduced
- **Why not chosen**: Doesn't provide enough value over basic transcription

### Alternative 2: Rule-Based Text Cleanup
- **Description**: Use regex and NLP libraries to clean text
- **Pros**:
  - No API cost
  - Fast processing
  - Deterministic
  - Works offline
- **Cons**:
  - Can't understand context
  - Can't restructure intelligently
  - Might break technical terms
  - Limited to pattern matching
  - Doesn't add structure
- **Why not chosen**: Not smart enough for meaningful improvement

### Alternative 3: Template-Based Structuring
- **Description**: Force transcription into predefined templates
- **Pros**:
  - Consistent output format
  - No AI needed
  - Fast
  - Predictable
- **Cons**:
  - Rigid, doesn't adapt to input
  - Can't handle varied use cases
  - Loses nuance
  - Might misclassify intent
- **Why not chosen**: Too inflexible for varied developer needs

### Alternative 4: Claude (Anthropic)
- **Description**: Use Claude 3 Opus instead of GPT-4
- **Pros**:
  - Excellent at structured output
  - Longer context window
  - Good at following instructions
  - Competitive pricing
- **Cons**:
  - Requires separate API key
  - Additional complexity
  - Less integration with Whisper
  - Anthropic rate limits
  - Two vendors to manage
- **Why not chosen**: Prefer single vendor (OpenAI) for simplicity

### Alternative 5: Local LLM (Llama, Mistral)
- **Description**: Run small model locally for transformation
- **Pros**:
  - No API cost
  - Privacy (no external call)
  - No rate limits
  - Works offline
- **Cons**:
  - Large model files (4-7GB)
  - Slow on CPU
  - Installation complexity
  - Inconsistent quality
  - Maintenance burden
- **Why not chosen**: Poor user experience, distribution complexity

---

## Consequences

### Positive Consequences
- **Intelligent transformation**: Context-aware restructuring
- **Better LLM results**: Structured prompts get better responses
- **Natural input**: Users speak freely, AI cleans up
- **Single API key**: Same OpenAI key as Whisper
- **Consistent quality**: GPT-4 is reliable
- **Configurable**: Can adjust system prompt for different styles
- **Optional**: Users can disable if they prefer raw transcription

### Negative Consequences
- **Additional cost**: ~$0.03 per transformation (2000 tokens @ $15/1M)
- **Latency**: Adds 2-4 seconds to workflow
- **API dependency**: Another API call that can fail
- **Non-deterministic**: Slight variations in output
- **Overkill for simple inputs**: "fix typo" doesn't need transformation

### Risks
- **Cost accumulation**: Heavy users incur significant costs
  - **Mitigation**: Make transformation optional
  - **Mitigation**: Show cost estimate in settings
  - **Mitigation**: Cache transformations (future)
  - **Likelihood**: Medium

- **Inappropriate transformations**: AI misinterprets intent
  - **Mitigation**: Show before/after preview (future)
  - **Mitigation**: Allow editing before insertion
  - **Mitigation**: Option to disable transformation
  - **Likelihood**: Low (GPT-4 is good)

- **OpenAI outage**: Transformation unavailable
  - **Mitigation**: Graceful fallback to raw transcription
  - **Mitigation**: Show clear error message
  - **Likelihood**: Low

- **Rate limiting**: Too many transformation requests
  - **Mitigation**: Same rate limit strategy as Whisper
  - **Mitigation**: Exponential backoff
  - **Likelihood**: Low

### Technical Debt
- **Single provider lock-in**: Tightly coupled to OpenAI
  - **Payoff strategy**: Abstract behind `IPromptTransformer` interface
  - **Timeline**: Can add Claude/local alternatives in v0.5+
  - **Effort**: 1 week to add alternative provider

---

## Implementation Notes

### Transformation Service

```typescript
export class OpenAIPromptTransformer implements IPromptTransformer {
  private client: OpenAI;

  constructor(
    private secretStorage: SecretStorage,
    private logger: ILogger
  ) {
    this.initializeClient();
  }

  async transform(
    transcription: string,
    context?: PromptContext
  ): Promise<TransformedPrompt> {
    const systemPrompt = this.buildSystemPrompt(context);

    try {
      const completion = await this.client.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: transcription }
        ],
        temperature: 0.3,  // Slightly creative but consistent
        max_tokens: 2000
      });

      const transformedText = completion.choices[0].message.content || transcription;

      return {
        originalText: transcription,
        transformedText,
        improvements: this.detectImprovements(transcription, transformedText)
      };
    } catch (error) {
      this.logger.error('Prompt transformation failed', error);
      // Graceful fallback: return original
      return {
        originalText: transcription,
        transformedText: transcription,
        improvements: ['Transformation failed, using original text']
      };
    }
  }

  private buildSystemPrompt(context?: PromptContext): string {
    let prompt = `You are an assistant specialized in transforming natural speech into structured, optimized prompts for LLMs.

Your task:
1. Analyze the user's spoken input
2. Identify the main intention
3. Structure requirements, objectives, and constraints clearly
4. Remove filler words and repetitions
5. Maintain technical language
6. Separate clearly: context, objective, technical requirements, constraints

Return ONLY the optimized prompt, no explanations.`;

    if (context?.editorLanguage) {
      prompt += `\n\nContext: User is editing ${context.editorLanguage} code.`;
    }

    if (context?.projectType) {
      prompt += `\nProject type: ${context.projectType}`;
    }

    return prompt;
  }

  private detectImprovements(original: string, transformed: string): string[] {
    const improvements: string[] = [];

    if (transformed.length < original.length * 0.8) {
      improvements.push('Condensed and more concise');
    }

    if (/#{1,3}\s/.test(transformed) && !/#{1,3}\s/.test(original)) {
      improvements.push('Added section structure');
    }

    if (transformed.split('\n').length > original.split('\n').length + 2) {
      improvements.push('Improved formatting with line breaks');
    }

    const technicalKeywords = ['implement', 'refactor', 'optimize', 'requirement'];
    const originalKeywords = technicalKeywords.filter(k => original.toLowerCase().includes(k)).length;
    const transformedKeywords = technicalKeywords.filter(k => transformed.toLowerCase().includes(k)).length;
    
    if (transformedKeywords > originalKeywords) {
      improvements.push('Enhanced technical clarity');
    }

    return improvements;
  }
}
```

### Use Case Integration

```typescript
export class TransformPromptUseCase {
  constructor(
    private promptTransformer: IPromptTransformer,
    private configRepo: IConfigRepository,
    private logger: ILogger
  ) {}

  async execute(transcription: string): Promise<TransformedPrompt> {
    const config = await this.configRepo.getConfig();

    // Check if transformation is enabled
    if (!config.enablePromptTransformation) {
      return {
        originalText: transcription,
        transformedText: transcription,
        improvements: []
      };
    }

    // Gather context
    const context: PromptContext = {
      editorLanguage: vscode.window.activeTextEditor?.document.languageId,
      projectType: await this.detectProjectType()
    };

    // Transform
    try {
      return await this.promptTransformer.transform(transcription, context);
    } catch (error) {
      this.logger.error('Transformation failed, using original', error);
      // Fallback to original
      return {
        originalText: transcription,
        transformedText: transcription,
        improvements: ['Transformation unavailable']
      };
    }
  }

  private async detectProjectType(): Promise<string | undefined> {
    // Simple project type detection
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) return undefined;

    const rootPath = workspaceFolders[0].uri.fsPath;
    
    // Check for common files
    if (await this.fileExists(path.join(rootPath, 'package.json'))) {
      return 'Node.js/JavaScript';
    }
    if (await this.fileExists(path.join(rootPath, 'pom.xml'))) {
      return 'Java/Maven';
    }
    if (await this.fileExists(path.join(rootPath, 'requirements.txt'))) {
      return 'Python';
    }

    return undefined;
  }
}
```

### Cost Estimation

**Per transformation**:
- Input: ~200 tokens (typical transcription)
- Output: ~500 tokens (structured prompt)
- Total: ~700 tokens
- Cost: ~$0.01 per transformation (at GPT-4o rates)

**Heavy user** (50 transformations/day):
- Cost: ~$0.50/day = ~$15/month

**Comparison to Whisper**:
- Whisper: $0.006 per minute
- Transformation: ~$0.01 per prompt
- Combined: ~$0.016 per recording

---

## References

- [GPT-4 API Documentation](https://platform.openai.com/docs/guides/gpt)
- [OpenAI Pricing](https://openai.com/pricing)
- [Prompt Engineering Guide](https://www.promptingguide.ai/)
