import OpenAI from "openai";

class LiteLLMManager {
  private client: OpenAI;

  constructor() {
    // Initialize OpenAI client with explicit configuration
    // Can work with:
    // 1. OpenAI's API with OPENAI_API_KEY
    // 2. Local LLM servers via base URL (Ollama, LiteLLM proxy, etc.)
    // 3. Other providers via LiteLLM proxy

    const apiKey = process.env.LLM_API_KEY || "not-needed";
    const baseURL = process.env.LLM_BASE_URL || "http://localhost:8000/v1";
    const defaultModel = process.env.LLM_MODEL || "gpt-3.5-turbo";

    this.client = new OpenAI({
      apiKey,
      baseURL,
      defaultHeaders: {
        "User-Agent": "mind-scribe-api/1.0",
      },
    });

    console.log(`LiteLLM Manager initialized`);
    console.log(`Base URL: ${baseURL}`);
    console.log(`Default Model: ${defaultModel}`);
  }

  /**
   * Send a message and get a streaming response
   * Yields chunks of text as they arrive from the model
   */
  async *streamChatResponse(
    userMessage: string,
    systemPrompt: string,
  ): AsyncGenerator<string, void, unknown> {
    const model = process.env.LLM_MODEL || "gpt-3.5-turbo";

    try {
      const stream = await this.client.chat.completions.create({
        model,
        max_tokens: 1024,
        temperature: 0.7,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userMessage,
          },
        ],
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }
    } catch (err) {
      console.error("Error in streamChatResponse:", err);
      throw err;
    }
  }

  /**
   * Get complete chat response (non-streaming)
   * Useful for fallback or when streaming is not needed
   */
  async getChatResponse(
    userMessage: string,
    systemPrompt: string,
  ): Promise<string> {
    const model = process.env.LLM_MODEL || "gpt-3.5-turbo";

    try {
      const response = await this.client.chat.completions.create({
        model,
        max_tokens: 1024,
        temperature: 0.7,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userMessage,
          },
        ],
      });

      if (response.choices[0]?.message?.content) {
        return response.choices[0].message.content;
      }

      return "";
    } catch (err) {
      console.error("Error in getChatResponse:", err);
      throw err;
    }
  }

  getClient(): OpenAI {
    return this.client;
  }
}

export default new LiteLLMManager();
