# LiteLLM SDK Setup Guide

This guide explains how to set up and configure the Mind Scribe application with LiteLLM SDK for LLM inference with streaming support.

## Overview

Mind Scribe now uses **LiteLLM SDK** for LLM inference instead of direct Ollama integration. This provides:

- ✅ **Flexible Provider Support** - Works with OpenAI, Anthropic, Ollama, local endpoints, and more
- ✅ **Response Streaming** - Real-time text streaming via Server-Sent Events (SSE)
- ✅ **Better Performance** - Optimized inference with configurable models
- ✅ **Provider Agnostic** - Easy to switch between different LLM providers

## Architecture

### Backend Flow

```
Client Request
    ↓
Express API (POST /chat)
    ↓
LiteLLM Manager (openai SDK)
    ↓
LLM Provider (OpenAI, Ollama, Local, etc.)
    ↓
Stream Response (SSE)
    ↓
Browser Client (EventSource)
```

### Streaming Implementation

The chat endpoint now uses **Server-Sent Events (SSE)** to stream LLM responses:

- **Event Types:**
  - `metadata`: Contains `conversation_id` and `mood` information
  - `text`: Contains text chunks as they arrive from the model
  - `error`: Contains error messages if something goes wrong
  - `done`: Signals the end of the response stream

- **Frontend Integration:**
  - New `useSendMessageStream()` hook for streaming responses
  - Old `useSendMessage()` hook still available for backward compatibility
  - Real-time text updates in the UI as model responds

## Configuration

### Required Environment Variables

Create a `.env` file in `apps/api/`:

```env
# ===================================
# LLM Configuration (Required)
# ===================================

# Base URL for your LLM endpoint
# Should be OpenAI-compatible API endpoint
# Examples:
#   - http://localhost:8000/v1 (LiteLLM Proxy)
#   - http://localhost:11434/v1 (Ollama)
#   - https://api.openai.com/v1 (OpenAI)
LLM_BASE_URL=http://localhost:8000/v1

# Model identifier
# Examples: gpt-3.5-turbo, llama2, mistral, etc.
LLM_MODEL=gpt-3.5-turbo

# API Key (if required by your provider)
# Leave empty for local/self-hosted models
LLM_API_KEY=

# ===================================
# Database Configuration (Optional)
# ===================================
MONGODB_URI=mongodb://localhost:27017/mindscribe

# ===================================
# Server Configuration (Optional)
# ===================================
PORT=8000
```

## Setup Options

### Option 1: Using OpenAI API

```env
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-3.5-turbo
LLM_API_KEY=sk-your-api-key-here
```

### Option 2: Using Ollama (Local)

**Step 1: Install and run Ollama**

```bash
# Install Ollama: https://ollama.ai

# Start Ollama service
ollama serve

# In another terminal, pull a model
ollama pull llama2
```

**Step 2: Run LiteLLM Proxy**

```bash
# Install LiteLLM
pip install litellm

# Start proxy pointing to Ollama
litellm --model ollama/llama2 --api_base http://localhost:11434
```

**Step 3: Configure Mind Scribe**

```env
LLM_BASE_URL=http://localhost:8000/v1
LLM_MODEL=ollama/llama2
LLM_API_KEY=
```

### Option 3: Using HuggingFace Models via LiteLLM

```bash
# Install requirements
pip install litellm huggingface-hub

# Set HuggingFace token
export HUGGINGFACE_API_KEY=your-token-here

# Start LiteLLM Proxy
litellm --model huggingface/meta-llama/Llama-2-7b-chat-hf
```

**Configure:**

```env
LLM_BASE_URL=http://localhost:8000/v1
LLM_MODEL=huggingface/meta-llama/Llama-2-7b-chat-hf
LLM_API_KEY=your-huggingface-token
```

### Option 4: Using Local Text Generation WebUI

```bash
# Install and run Text Generation WebUI (oobabooga)
# https://github.com/oobabooga/text-generation-webui

# Start with OpenAI-compatible API
python server.py --listen --listen-port 5000 --api
```

**Configure:**

```env
LLM_BASE_URL=http://localhost:5000/v1
LLM_MODEL=text-generation-webui
LLM_API_KEY=
```

## Running the Application

### 1. Start Your LLM Provider

Choose one of the setup options above and ensure your LLM endpoint is running.

### 2. Start MongoDB

```bash
# macOS
brew services start mongodb-community

# Linux
sudo systemctl start mongod

# Docker
docker run -d -p 27017:27017 mongo
```

### 3. Install Dependencies

```bash
bun install
```

### 4. Run Development Servers

```bash
bun run dev
```

This will start:

- **Backend API**: http://localhost:8000
- **Frontend**: http://localhost:5173

## Testing the Streaming

### Using cURL

```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "user_message": "Hello, how are you?"
  }'
```

### Using JavaScript/TypeScript

```typescript
import { sendMessageStream } from "./api/chatApi";

// Start streaming
for await (const event of sendMessageStream({
  message: "How are you?",
  conversationId: "optional-id",
})) {
  if (event.type === "text") {
    console.log("Chunk:", event.content);
  } else if (event.type === "metadata") {
    console.log("Convo ID:", event.conversation_id);
  } else if (event.type === "error") {
    console.error("Error:", event.content);
  }
}
```

## Troubleshooting

### LLM Endpoint Connection Issues

```bash
# Test if endpoint is accessible
curl http://localhost:8000/v1/models

# Check logs of your LLM provider
# For Ollama:
ollama list

# For LiteLLM Proxy:
litellm --debug
```

### Model Not Found Error

```bash
# Verify model is available
curl http://localhost:8000/v1/models

# For Ollama, pull the model:
ollama pull llama2
```

### Streaming Not Working

1. Check browser console for connection errors
2. Verify `Content-Type: text/event-stream` in response headers
3. Ensure `LLM_BASE_URL` is correct
4. Check backend logs for errors

## Performance Optimization

### For Better Streaming Performance

1. **Adjust Temperature**: Lower values (0.1-0.5) for more deterministic responses
2. **Set Max Tokens**: Configure reasonable limits to avoid long responses
3. **Use Smaller Models**: Faster responses for local models
4. **Add Caching**: Cache frequent responses

### Recommended Model Sizes

- **Fast Models** (2-7B): Good for real-time, local setup
  - Mistral-7B
  - Llama 2 7B
  - Neural Chat 7B

- **Quality Models** (13B+): Better responses, slower
  - Llama 2 13B
  - Mistral Medium

- **Cloud Models**: Fast and reliable
  - GPT-3.5-turbo
  - GPT-4

## Advanced Configuration

### Using Custom Model Endpoints

If you have a custom endpoint that's OpenAI-compatible:

```env
LLM_BASE_URL=https://your-custom-endpoint.com/v1
LLM_MODEL=your-model-id
LLM_API_KEY=your-api-key
```

### Using Different Models Per Request

The current setup uses a single model configured via env vars. To support multiple models, you would need to modify `litellmManager.ts` to accept model parameter.

## Documentation

- [LiteLLM Documentation](https://docs.litellm.ai/)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [Server-Sent Events Guide](https://html.spec.whatwg.org/multipage/server-sent-events.html)

## Migration from Ollama Setup

If you were previously using the direct local Ollama setup:

1. **Old Setup:**
   - `ollamaManager.ts` handled Ollama startup and model management
   - HTTP requests without streaming
   - Synchronous response handling

2. **New Setup:**
   - `litellmManager.ts` uses OpenAI SDK
   - Streaming via Server-Sent Events
   - Async generator pattern for response handling
   - More flexible provider support

The new setup is backward compatible - you can still use Ollama as the backend by running it through LiteLLM Proxy.
