// apps/server/src/services/ai.service.ts
import axios from "axios";
import { Readable } from "stream";
import chatMessage from "../models/chatMessage.js";

const PYTHON_AI_SERVICE_URL = process.env.AI_SERVICE_URL;

export class AIService {
  /**
   * Forwards structured recommendation query to Python FastAPI using Axios
   */
  static async getRecommendations(query: string) {
    const response = await axios.post(
      `${PYTHON_AI_SERVICE_URL}/chat/recommend`,
      {
        message: query,
      },
    );
    return response.data;
  }

  /**
   * Proxies stream from Python FastAPI AI service and returns a Readable stream for Fastify
   */
  static async getChatStream(
    message: string,
    conversationId: string,
  ): Promise<Readable> {
    // 1. Save user's message to PostgreSQL via Sequelize
    await chatMessage.create({
      conversationId,
      sender: "user",
      content: message,
    });

    // 2. Fetch stream from Python AI engine using Axios
    const response = await axios.post(
      `${PYTHON_AI_SERVICE_URL}/chat/stream`,
      {
        message,
        conversation_id: conversationId,
      },
      {
        responseType: "stream",
      },
    );

    return response.data as Readable;
  }

  /**
   * Helper to persist AI's completed streamed message into PostgreSQL
   */
  static async saveAIMessage(conversationId: string, content: string) {
    await chatMessage.create({
      conversationId,
      sender: "ai",
      content,
    });
  }
}
