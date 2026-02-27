import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchChatHistory,
  sendMessageStream,
  deleteChat,
} from "../api/chatApi";
import useChatStore from "../store/chatStore";

export const useFetchChatHistory = () => {
  const setChatHistory = useChatStore((state) => state.setChatHistory);

  return useQuery({
    queryKey: ["chatHistory"],
    queryFn: async () => {
      const data = await fetchChatHistory();
      setChatHistory(data);
      return data;
    },
  });
};

/**
 * Stream-based message sending hook
 * Streams text chunks as they arrive from the LLM
 */
export const useSendMessageStream = () => {
  const queryClient = useQueryClient();
  const setLoading = useChatStore((state) => state.setLoading);
  const updateConversation = useChatStore((state) => state.updateConversation);
  const selectedConversation = useChatStore(
    (state) => state.selectedConversation,
  );
  const setSelectedConversation = useChatStore(
    (state) => state.setSelectedConversation,
  );

  return useMutation({
    mutationFn: async ({
      message,
      conversationId,
      onChunk,
    }: {
      message: string;
      conversationId?: string;
      onChunk: (chunk: string) => void;
    }) => {
      setLoading(true);
      let fullResponse = "";
      let finalConversationId = conversationId;

      try {
        for await (const event of sendMessageStream({
          message,
          conversationId,
        })) {
          if (event.type === "text") {
            fullResponse += event.content;
            onChunk(event.content);
          } else if (event.type === "metadata") {
            finalConversationId = event.conversation_id;
          } else if (event.type === "error") {
            throw new Error(event.content);
          }
        }
        return {
          response: fullResponse,
          conversation_id: finalConversationId,
        };
      } catch (error) {
        setLoading(false);
        throw error;
      }
    },
    onSuccess: (response) => {
      setLoading(false);

      const userMessage = {
        id: Date.now(),
        user_message: "",
        type: "user",
      };
      const botMessage = {
        id: Date.now() + 1,
        bot_response: response.response,
        type: "ai",
      };

      if (!selectedConversation) {
        const newConversation = {
          id: response.conversation_id,
          messages: [userMessage, botMessage],
        };
        setSelectedConversation(newConversation);
      } else {
        updateConversation(selectedConversation.id, (conversation) => ({
          ...conversation,
          messages: [...conversation.messages, userMessage, botMessage],
        }));
      }

      queryClient.invalidateQueries({ queryKey: ["chatHistory"] });
    },
    onError: (error) => {
      console.error("Error sending message:", error);
      setLoading(false);
    },
  });
};

export const useDeleteChat = () => {
  const queryClient = useQueryClient();
  const deleteConversation = useChatStore((state) => state.deleteConversation);

  return useMutation({
    mutationFn: async (conversationId: string) => {
      const response = await deleteChat(conversationId);
      return response;
    },
    onSuccess: (_, conversationId) => {
      deleteConversation(conversationId);
      queryClient.invalidateQueries({ queryKey: ["chatHistory"] });
    },
    onError: (error) => {
      console.error("Error deleting chat:", error);
    },
  });
};
