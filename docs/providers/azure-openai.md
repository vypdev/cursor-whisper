# Azure OpenAI

Use GPT models deployed on Azure OpenAI Service.

## Configuration

```json
{
  "cursorWhisper.transformationProvider": "azure",
  "cursorWhisper.azureEndpoint": "https://my-resource.openai.azure.com",
  "cursorWhisper.azureDeployment": "gpt-4o-deployment"
}
```

## Setup

1. Create an Azure OpenAI resource and deploy a chat model
2. Run **Cursor Whisper: Configure Transformation Provider**
3. Select **Azure OpenAI**
4. Enter your Azure API key, endpoint URL, and deployment name

## Notes

- The **deployment name** (not the model name) is used for API calls
- Endpoint should be the resource URL without trailing slash
- API key is stored separately from your OpenAI key
