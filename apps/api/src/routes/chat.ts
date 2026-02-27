import express, { type Router } from "express";
import type { Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { getCurrentUser, type AuthRequest } from "./auth";
import { CRISIS_WORDS, DETECT_MOOD } from "@mindscribe/types";
import { getSystemPrompt } from "../systemPrompt";
import { Conversation, Message } from "@mindscribe/database";
import type mongoose from "mongoose";
import litellmManager from "../utils/litellmManager";

const router: Router = express.Router();

/**
 * Get conversation history for context
 */
const getConversationHistory = async (
  conversationId: string | null,
): Promise<string> => {
  if (!conversationId) {
    return "";
  }

  // Get the last 10 messages for context to keep it manageable
  const messages = await Message.find({ conversation_id: conversationId })
    .sort({ timestamp: -1 })
    .limit(10)
    .lean();

  // Reverse the messages to maintain chronological order
  messages.reverse();

  // Format the conversation history
  return messages
    .map((msg) => `User: ${msg.user_message}\nAssistant: ${msg.bot_response}`)
    .join("\n\n");
};

const detectMood = (userMessage: string): string | null => {
  const lower = userMessage.toLowerCase();
  for (const [mood, keywords] of Object.entries(DETECT_MOOD)) {
    if (keywords.some((word) => lower.includes(word))) {
      return mood;
    }
  }
  return null;
};

const createNewConversation = async (
  userId: mongoose.Types.ObjectId,
  conversationId: string,
): Promise<void> => {
  const conversation = new Conversation({
    _id: conversationId,
    user_id: userId,
  });
  await conversation.save();
};

const storeChat = async (
  userId: mongoose.Types.ObjectId,
  conversationId: string,
  userMessage: string,
  botResponse: string,
  mood: string | null,
  isCrisis: boolean,
): Promise<void> => {
  const messageId = uuidv4();
  const message = new Message({
    _id: messageId,
    user_id: userId,
    conversation_id: conversationId,
    user_message: userMessage,
    bot_response: botResponse,
    mood,
    is_crisis: isCrisis,
  });
  await message.save();
};

// POST /chat - Stream response using Server-Sent Events (SSE)
router.post(
  "/",
  getCurrentUser,
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { user } = req;
    if (!user) {
      res.status(401).json({ detail: "Unauthorized" });
      return;
    }

    let { user_message, conversation_id } = req.body;

    // Validate input
    if (!user_message || typeof user_message !== "string") {
      res.status(400).json({ detail: "user_message is required" });
      return;
    }

    const isCrisis = CRISIS_WORDS.some((word) =>
      user_message.toLowerCase().includes(word),
    );
    const mood = detectMood(user_message);

    try {
      if (!conversation_id) {
        conversation_id = uuidv4();
        await createNewConversation(user.id, conversation_id);
      }

      // Set SSE headers
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("Access-Control-Allow-Origin", "*");

      // Send conversation ID and mood first
      res.write(
        `data: ${JSON.stringify({ type: "metadata", conversation_id, mood })}\n\n`,
      );

      let fullResponse = "";

      if (isCrisis) {
        const crisisMessage =
          "Please seek professional help. You're not alone ❤️.";
        res.write(
          `data: ${JSON.stringify({ type: "text", content: crisisMessage })}\n\n`,
        );
        fullResponse = crisisMessage;
      } else {
        try {
          // Get conversation history for context
          const conversationHistory =
            await getConversationHistory(conversation_id);
          const systemPrompt = getSystemPrompt(
            user_message,
            conversationHistory,
          );

          // Stream the response
          for await (const chunk of litellmManager.streamChatResponse(
            user_message,
            systemPrompt,
          )) {
            fullResponse += chunk;
            res.write(
              `data: ${JSON.stringify({ type: "text", content: chunk })}\n\n`,
            );
          }
        } catch (err: unknown) {
          const error = err as { message?: string };
          const errorMsg =
            error.message || "An error occurred during inference";
          res.write(
            `data: ${JSON.stringify({ type: "error", content: errorMsg })}\n\n`,
          );
          res.end();
          return;
        }
      }

      // Send completion signal
      res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
      res.end();

      // Store chat asynchronously after response is sent
      await storeChat(
        user.id,
        conversation_id,
        user_message,
        fullResponse,
        mood,
        isCrisis,
      );
    } catch (err: unknown) {
      const error = err as { message?: string };
      const errorMsg = error.message || "An error occurred";
      console.error("Chat error:", errorMsg);

      if (!res.headersSent) {
        res.status(500).json({ detail: errorMsg });
      } else {
        res.write(
          `data: ${JSON.stringify({ type: "error", content: errorMsg })}\n\n`,
        );
        res.end();
      }
    }
  },
);

// GET /chat/history
router.get(
  "/history",
  getCurrentUser,
  async (req: AuthRequest, res: Response): Promise<Response> => {
    const { user } = req;
    if (!user) return res.status(401).json({ detail: "Unauthorized" });

    const limit = parseInt(req.query.limit as string) || 10;
    try {
      const messages = await Message.find({ user_id: user.id })
        .sort({ timestamp: -1 })
        .limit(limit)
        .lean();

      // Group messages by conversation_id
      const conversations: Record<
        string,
        { id: string; messages: unknown[]; timestamp: Date }
      > = {};
      messages.forEach((row) => {
        if (!conversations[row.conversation_id]) {
          conversations[row.conversation_id] = {
            id: row.conversation_id,
            messages: [],
            timestamp: row.timestamp,
          };
        }
        conversations[row.conversation_id].messages.push({
          id: row._id,
          user_message: row.user_message,
          bot_response: row.bot_response,
          mood: row.mood,
          is_crisis: row.is_crisis,
          timestamp: row.timestamp,
        });
      });

      return res.json({ history: Object.values(conversations) });
    } catch (err: unknown) {
      const error = err as { message?: string };
      return res
        .status(500)
        .json({ detail: error.message || "An error occurred" });
    }
  },
);

// DELETE /chat/:conversationId
router.delete(
  "/:conversationId",
  getCurrentUser,
  async (req: AuthRequest, res: Response): Promise<Response> => {
    const { user } = req;
    if (!user) return res.status(401).json({ detail: "Unauthorized" });

    const { conversationId } = req.params;

    try {
      // Delete all messages associated with the conversation
      await Message.deleteMany({
        user_id: user.id,
        conversation_id: conversationId,
      });

      // Delete the conversation itself
      await Conversation.deleteOne({
        _id: conversationId,
        user_id: user.id,
      });

      return res.json({ message: "Conversation deleted successfully" });
    } catch (err: unknown) {
      const error = err as { message?: string };
      return res
        .status(500)
        .json({ detail: error.message || "An error occurred" });
    }
  },
);

export { router as chatbotRouter };
