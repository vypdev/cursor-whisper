# ADR-0003: Use OpenAI Whisper for Transcription

**Status**: Accepted

**Date**: 2026-05-23

**Deciders**: Core Team

**Related**: [ADR-0011](0011-gpt4-transformation.md)

---

## Context

We need a Speech-To-Text (STT) service to transcribe audio recordings. The transcription quality is critical for the extension's value proposition.

Requirements:
- **High accuracy**: Especially for technical terminology
- **Multi-language support**: At least English, Spanish, French, German
- **Reasonable latency**: <10 seconds for typical recordings
- **Cost-effective**: Sustainable pricing model
- **Reliable**: High uptime, good SLA
- **Developer-friendly**: Good API, TypeScript SDK

The transcription service is a core dependency, used every time a user records audio.

---

## Decision

**We will use OpenAI Whisper API (`whisper-1` model) for audio transcription.**

Key aspects:
- Use official `openai` Node.js SDK (v4.x)
- Support `whisper-1` model initially
- Configure with:
  - Language hint (user-configurable)
  - Prompt for technical context
  - Temperature 0.0 for deterministic output
- Maximum file size: 25MB (OpenAI limit)
- Recommended duration: 0.1s - 5 minutes
- Fallback: Show error with option to retry

---

## Alternatives Considered

### Alternative 1: Google Speech-to-Text
- **Description**: Google Cloud Speech-to-Text API
- **Pros**:
  - Excellent accuracy
  - Real-time streaming support
  - Good language support
  - Custom vocabulary
- **Cons**:
  - More complex setup (GCP account, credentials)
  - Higher cost for similar quality
  - More API complexity
  - Requires separate SDK
- **Why not chosen**: Higher complexity, not meaningfully better than Whisper

### Alternative 2: Azure Speech Services
- **Description**: Microsoft Azure Cognitive Services Speech
- **Pros**:
  - Good accuracy
  - Streaming support
  - Integration with VSCode ecosystem
- **Cons**:
  - Requires Azure account
  - More expensive
  - Regional availability issues
  - Less developer-friendly API
- **Why not chosen**: Higher cost, more complexity

### Alternative 3: AssemblyAI
- **Description**: AssemblyAI Speech-to-Text API
- **Pros**:
  - Developer-friendly
  - Good documentation
  - Competitive pricing
  - Good TypeScript support
- **Cons**:
  - Less accurate than Whisper for technical content
  - Smaller company (reliability risk)
  - Less brand recognition
  - No prompt engineering support
- **Why not chosen**: Lower accuracy, less reliable

### Alternative 4: Local Whisper (whisper.cpp)
- **Description**: Run Whisper model locally using whisper.cpp bindings
- **Pros**:
  - No API costs
  - Complete privacy (no data sent externally)
  - No internet required
  - No API rate limits
- **Cons**:
  - Requires local model files (~1-3GB)
  - Slow on machines without GPU
  - Complex setup for users
  - Platform-specific binaries
  - Memory intensive
  - Harder to maintain
- **Why not chosen**: Poor user experience, complex distribution

### Alternative 5: Web Speech API
- **Description**: Browser's built-in Speech Recognition API
- **Pros**:
  - Free
  - No external dependencies
  - Fast (local processing)
  - No API key required
- **Cons**:
  - Very poor accuracy
  - Limited language support
  - No technical vocabulary
  - Inconsistent across browsers
  - Not available in Node.js webviews
- **Why not chosen**: Unacceptably low quality for our use case

---

## Consequences

### Positive Consequences
- **Excellent accuracy**: State-of-the-art STT, especially for English
- **Easy integration**: Official SDK with TypeScript support
- **Multi-language**: 50+ languages supported
- **Prompt engineering**: Can provide technical context
- **Same ecosystem**: Already using OpenAI for GPT-4
- **Simple auth**: Single API key for both services
- **Good documentation**: Extensive docs and examples
- **Reliable**: OpenAI infrastructure is stable

### Negative Consequences
- **API dependency**: Requires internet connection
- **Cost**: ~$0.006 per minute of audio
- **Latency**: Network round-trip adds delay
- **Privacy**: Audio sent to external service
- **Vendor lock-in**: Switching providers requires refactoring
- **Rate limits**: Subject to OpenAI rate limits
- **API changes**: OpenAI might change API

### Risks
- **OpenAI outage**: Service unavailable
  - **Mitigation**: Show clear error, allow retry
  - **Mitigation**: Future: Add alternative provider
  
- **Cost explosion**: Heavy users rack up charges
  - **Mitigation**: Max recording duration limit (120s default)
  - **Mitigation**: Show cost estimate in settings
  - **Mitigation**: Optional: Usage tracking in future
  
- **API key leaked**: User's key compromised
  - **Mitigation**: Store in VSCode SecretStorage
  - **Mitigation**: Never log API key
  - **Mitigation**: Documentation on key security
  
- **Rate limiting**: Too many requests
  - **Mitigation**: Prevent concurrent transcriptions
  - **Mitigation**: Show clear error message
  - **Mitigation**: Exponential backoff on retry

### Technical Debt
- **Tight coupling**: Current implementation specific to OpenAI
  - **Payoff strategy**: Abstract behind `ITranscriptionService` port (already done)
  - **Timeline**: Can add alternative providers in v0.4+

---

## Implementation Notes

### API Integration

```typescript
import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const transcription = await client.audio.transcriptions.create({
  file: audioFile,
  model: 'whisper-1',
  language: 'en',              // Optional: 'es', 'fr', etc.
  prompt: 'Technical discussion', // Optional: context hint
  temperature: 0.0,            // Deterministic
  response_format: 'json'      // or 'text', 'srt', 'vtt'
});

console.log(transcription.text);
```

### Error Handling

```typescript
try {
  const result = await transcribe(audio);
} catch (error) {
  if (error instanceof OpenAI.APIError) {
    // Handle API errors (401, 429, 500, etc.)
    if (error.status === 401) {
      throw new AuthenticationError('Invalid API key');
    } else if (error.status === 429) {
      throw new RateLimitError('Rate limit exceeded');
    }
  }
  throw error;
}
```

### Cost Estimation

- **Whisper API**: $0.006 per minute
- **Typical recording**: 30-60 seconds
- **Cost per use**: $0.003 - $0.006
- **Heavy user** (50 recordings/day): ~$0.15 - $0.30/day

### Future Enhancements

- **Streaming**: Use `gpt-4o-audio-preview` when available for real-time transcription
- **Caching**: Cache transcriptions by audio hash to avoid re-transcription
- **Multiple providers**: Add Google/Azure as fallback options
- **Local option**: Provide whisper.cpp for privacy-conscious users

---

## References

- [OpenAI Whisper API Documentation](https://platform.openai.com/docs/guides/speech-to-text)
- [OpenAI Node.js SDK](https://github.com/openai/openai-node)
- [Whisper Model Paper](https://arxiv.org/abs/2212.04356)
- [OpenAI Pricing](https://openai.com/pricing)
