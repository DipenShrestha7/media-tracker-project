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
      const body = (request.body as any) || {};
      const sessionId = body.sessionId;
      const prompt = body.prompt || body.message;

      if (!sessionId || !prompt) {
        return reply
          .status(400)
          .send({ message: "sessionId and prompt are required" });
      }

      try {
        // 2. Verify session exists
        const session = await SessionEntry.findByPk(sessionId);
        if (!session) {
          return reply.status(404).send({ message: "Session not found" });
        }

        //3. Always save user message FIRST so DB order is correct for the next turn
        await MessageEntry.create({
          session_id: sessionId,
          sender: "user",
          content: prompt,
        });

        // 4. Request streaming response from Python LangChain backend

        // 1. Fetch history from DB
        const history = await MessageEntry.findAll({
          where: { session_id: sessionId },
          order: [["createdAt", "DESC"]],
          limit: 6,
        });

        // 2. Format history array (oldest to newest)
        const formattedHistory = history.reverse().map((msg) => ({
          role: msg.sender.toLowerCase() === "user" ? "user" : "assistant",
          content: msg.content,
        }));

        // 3. The user message was saved before the history fetch, so formattedHistory
        //    already contains it as the last item — no need to append again.
        const payload = [...formattedHistory];

        // 4. Send request matching updated Python schema
        const pythonResponse = await axios.post(
          `${AI_SERVICE_URL}/chat/stream`,
          {
            messages: payload, // Changed key to 'messages'
            conversation_id: sessionId,
          },
          { responseType: "stream" },
        );

        // 5. Set SSE and CORS Headers for direct reply.raw writing
        // hijack() is REQUIRED: tells Fastify to release socket ownership so
        // manual reply.raw.write() calls flush immediately instead of buffering.
        reply.hijack();
        reply.raw.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "Access-Control-Allow-Origin": "*",
          "X-Accel-Buffering": "no",
        });

        let accumulatedText = "";
        let streamBuffer = "";

        // 6. Pipe raw chunks to frontend while parsing clean text for DB
        pythonResponse.data.on("data", (chunk: Buffer) => {
          const chunkStr = chunk.toString("utf8");
          reply.raw.write(chunkStr);
          streamBuffer += chunkStr;
          const lines = streamBuffer.split("\n");
          streamBuffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmedLine = line.trimEnd();

            if (trimmedLine.startsWith("data: ")) {
              accumulatedText += trimmedLine.slice(6).replace(/\\n/g, "\n");
            } else if (trimmedLine.startsWith("data:")) {
              accumulatedText += trimmedLine.slice(5).replace(/\\n/g, "\n");
            }
          }
        });

        pythonResponse.data.on("end", async () => {
          // 7. Save user prompt then AI response to DB (order matters for next turn's history)
          try {
            // Flush any remaining buffered SSE data
            if (streamBuffer.length > 0) {
              const trimmedLine = streamBuffer.trimEnd();
              if (trimmedLine.startsWith("data: ")) {
                accumulatedText += trimmedLine.slice(6).replace(/\\n/g, "\n");
              } else if (trimmedLine.startsWith("data:")) {
                accumulatedText += trimmedLine.slice(5).replace(/\\n/g, "\n");
              }
            }

            await MessageEntry.create({
              session_id: sessionId,
              sender: "ai",
              content: accumulatedText,
            });
          } catch (dbError) {
            fastify.log.error(dbError, "Failed to save messages to DB");
          }
          reply.raw.end();
        });

        pythonResponse.data.on("error", (err: Error) => {
          fastify.log.error(err, "Python stream error");
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
