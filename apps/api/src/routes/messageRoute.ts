import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import axios from "axios";
import { MessageEntry } from "../models/chatMessageModel.js";
import { SessionEntry } from "../models/chatSessionModel.js";
import { LibraryEntry } from "../models/libraryEntryModel.js";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

interface ChatRequestBody {
  sessionId: string;
  prompt: string;
}

interface LibraryItem {
  title: string;
  type: string;
  year?: number | null;
  genre?: string[];
  rating?: number | null;
  status: "COMPLETED" | "WATCHING" | "PLAN_TO_WATCH";
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

        const requiresLibraryContext = (userPrompt: string): boolean => {
          // Regex with word boundaries prevents accidental substring triggers
          const directKeywords =
            /\b(library|list|watchlist|suggest|recommend|watched|what should i watch)\b/i;

          // 1. Direct match in prompt
          if (directKeywords.test(userPrompt)) return true;

          // 2. Contextual follow-up check (e.g. "check again", "show me more")
          const followUpKeywords =
            /\b(check again|show me|what else|update|again)\b/i;
          const lastUserMsg =
            history.slice(-2).find((m) => m.sender === "user")?.content || "";

          return (
            followUpKeywords.test(userPrompt) &&
            directKeywords.test(lastUserMsg)
          );
        };

        const formatLibraryToString = (items: LibraryItem[]): string => {
          if (!items || items.length === 0) {
            return "USER LIBRARY: No items saved.";
          }

          // 1. Group items by status
          const completed: string[] = [];
          const watching: string[] = [];
          const planToWatch: string[] = [];

          for (const item of items) {
            const yearStr = item.year ? ` (${item.year})` : "";
            const typeStr = item.type ? ` [${item.type}]` : "";
            const genreStr =
              item.genre && item.genre.length > 0
                ? ` | Genres: ${item.genre.join(", ")}`
                : "";

            if (item.status === "COMPLETED") {
              const ratingStr = item.rating
                ? ` | Rating: ${item.rating}/10`
                : " | Unrated";
              completed.push(
                `- ${item.title}${yearStr}${typeStr}${ratingStr}${genreStr}`,
              );
            } else if (item.status === "WATCHING") {
              watching.push(`- ${item.title}${yearStr}${typeStr}${genreStr}`);
            } else if (item.status === "PLAN_TO_WATCH") {
              // Omit genres for watchlist to save additional tokens
              planToWatch.push(`- ${item.title}${yearStr}${typeStr}`);
            }
          }

          // 2. Build structured string block
          let output = "USER MEDIA LIBRARY:\n";

          output += "\n[COMPLETED / WATCHED]\n";
          output += completed.length > 0 ? completed.join("\n") : "None";

          output += "\n\n[CURRENTLY WATCHING]\n";
          output += watching.length > 0 ? watching.join("\n") : "None";

          output += "\n\n[PLAN TO WATCH / WATCHLIST]\n";
          output += planToWatch.length > 0 ? planToWatch.join("\n") : "None";

          return output;
        };

        let systemContent = `You are a media recommendation assistant. 
        FORMATTING RULES:
        - When presenting library data, render a SINGLE combined Markdown table.
        - Use columns: | Media Type | Title | Year | Status | Rating |.
        - Do NOT output separate tables for empty categories or individual media types.
        - Omit null, empty, or 'none' entries completely.`;

        if (requiresLibraryContext(prompt)) {
          const libraryItems = await LibraryEntry.findAll({
            where: { userId: session.user_id },
            attributes: ["title", "type", "year", "genre", "status", "rating"],
            order: [["updatedAt", "DESC"]],
            limit: 50,
          });

          const libraryString = formatLibraryToString(libraryItems);

          systemContent +=
            `\n\n${libraryString}\n\n` +
            `INSTRUCTIONS:\n` +
            `- Never suggest items from [COMPLETED] or [CURRENTLY WATCHING].\n` +
            `- Prioritize matching items from [PLAN TO WATCH] first if relevant.`;
        }

        // History already includes the user message saved above.
        // Keep library/system instructions in system_context, not in messages.
        const pythonResponse = await axios.post(
          `${AI_SERVICE_URL}/chat/stream`,
          {
            messages: formattedHistory,
            system_context: systemContent,
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
