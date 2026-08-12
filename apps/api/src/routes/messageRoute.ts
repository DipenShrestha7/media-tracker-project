import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import axios from "axios";
import { MessageEntry } from "../models/chatMessageModel.js";
import { SessionEntry } from "../models/chatSessionModel.js";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

interface ChatRequestBody {
  sessionId: string;
  prompt: string;
}

async function messageRoutes(fastify: FastifyInstance) {
  // GET /messages/:sessionId - Retrieve history for a given session
  fastify.get(
    "/sessions/:sessionId/messages",
    async (
      request: FastifyRequest<{ Params: { sessionId: string } }>,
      reply: FastifyReply,
    ) => {
      try {
        const { sessionId } = request.params;
        const messages = await MessageEntry.findAll({
          where: { session_id: sessionId },
          order: [["createdAt", "ASC"]],
        });
        return reply.send(messages);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Failed to fetch messages" });
      }
    },
  );

  fastify.post(
    "/stream",
    async (
      request: FastifyRequest<{ Body: ChatRequestBody }>,
      reply: FastifyReply,
    ) => {
      const { sessionId, prompt } = request.body;

      if (!sessionId || !prompt) {
        return reply
          .status(400)
          .send({ message: "sessionId and prompt are required" });
      }

      try {
        // 1. Verify session exists
        const session = await SessionEntry.findByPk(sessionId);
        if (!session) {
          return reply.status(404).send({ message: "Session not found" });
        }

        // 2. Save User prompt to Node DB
        await MessageEntry.create({
          session_id: sessionId,
          sender: "user",
          content: prompt,
        });

        // 3. Request streaming response from Python LangChain backend
        const pythonResponse = await axios.post(
          `${AI_SERVICE_URL}/chat/stream`,
          {
            message: prompt,
            conversation_id: sessionId,
          },
          { responseType: "stream" },
        );

        // 4. Set SSE Headers for client
        reply.raw.setHeader("Content-Type", "text/event-stream");
        reply.raw.setHeader("Cache-Control", "no-cache");
        reply.raw.setHeader("Connection", "keep-alive");

        let accumulatedResponse = "";

        // 5. Pipe chunks from Python stream to frontend while capturing text for DB
        pythonResponse.data.on("data", (chunk: Buffer) => {
          const chunkStr = chunk.toString("utf8");
          accumulatedResponse += chunkStr;
          reply.raw.write(chunkStr);
        });

        pythonResponse.data.on("end", async () => {
          // 6. Save complete Assistant output to Node DB when stream ends
          try {
            await MessageEntry.create({
              session_id: sessionId,
              sender: "ai",
              content: accumulatedResponse,
            });
          } catch (dbError) {
            fastify.log.error(dbError, ": Failed to save assistant message:");
          }
          reply.raw.end();
        });

        pythonResponse.data.on("error", (err: Error) => {
          fastify.log.error(err, ": Python stream error");
          reply.raw.end();
        });
      } catch (error) {
        fastify.log.error(error);
        if (!reply.raw.headersSent) {
          return reply
            .status(500)
            .send({ error: "Failed to forward request to AI service" });
        }
        reply.raw.end();
      }
    },
  );

  fastify.post(
    "/recommend",
    async (
      request: FastifyRequest<{ Body: { prompt: string } }>,
      reply: FastifyReply,
    ) => {
      const { prompt } = request.body;

      if (!prompt) {
        return reply.status(400).send({ message: "prompt is required" });
      }

      try {
        // Forward query to Python's structured output endpoint
        const response = await axios.post(`${AI_SERVICE_URL}/chat/recommend`, {
          message: prompt,
        });

        return reply.send(response.data);
      } catch (error: any) {
        fastify.log.error(error);
        const errorMessage =
          error.response?.data?.detail || "Recommendation service error";
        return reply.status(500).send({ error: errorMessage });
      }
    },
  );
}

export default messageRoutes;
