import axiosInstance from "./axiosInstance";

export const fetchChatHistory = async () => {
  const response = await axiosInstance.get("/chat/history");
  return response.data.history;
};

/**
 * Stream chat messages using Server-Sent Events
 * Returns an async generator that yields message chunks and metadata
 */
export const sendMessageStream = async function* ({
  message,
  conversationId,
}: {
  message: string;
  conversationId?: string;
}) {
  try {
    const response = await fetch(
      `${axiosInstance.defaults.baseURL || "http://localhost:8000"}/chat/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("authToken") || ""}`,
        },
        body: JSON.stringify({
          user_message: message,
          conversation_id: conversationId,
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} ${errorText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("Response body is null");
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");

      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const jsonStr = line.slice(6);
          const event = JSON.parse(jsonStr);
          yield event;
        }
      }
    }

    if (buffer.startsWith("data: ")) {
      const jsonStr = buffer.slice(6);
      const event = JSON.parse(jsonStr);
      yield event;
    }
  } catch (error) {
    console.error("Stream error:", error);
    yield {
      type: "error",
      content: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

export const deleteChat = async (conversationId: string) => {
  const response = await axiosInstance.delete(`/chat/${conversationId}`);
  return response.data;
};
