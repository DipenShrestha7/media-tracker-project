import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { SessionEntry } from "../models/chatSessionModel.js";
import { verifyToken } from "../utils/jose.js";

const getUserIdFromAuthHeader = async (
  authHeader?: string,
): Promise<string | null> => {
  if (!authHeader) return null;
  const token = authHeader.split(" ")[1];
  if (!token) return null;
  const decoded = (await verifyToken(token)) as { userId: string } | null;
  if (!decoded || !decoded.userId) return null;
  return decoded.userId;
};

async function sessionRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/sessions",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = await getUserIdFromAuthHeader(
          request.headers.authorization,
        );
        if (!userId) {
          return reply
            .status(401)
            .send({ message: "Unauthorized or invalid token" });
        }
        console.log("User ID from token:", userId);
        const sessions = await SessionEntry.findAll({
          where: { user_id: userId },
          order: [["createdAt", "DESC"]],
        });

        return reply.send(sessions);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Failed to fetch sessions" });
      }
    },
  );

  fastify.post(
    "/sessions",
    async (
      request: FastifyRequest<{
        Body: { firstPrompt?: string; title?: string };
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const userId = await getUserIdFromAuthHeader(
          request.headers.authorization,
        );
        if (!userId) {
          return reply.status(401).send({ message: "Unauthorized" });
        }

        const promptText = request.body?.firstPrompt || request.body?.title;

        if (!promptText) {
          return reply
            .status(400)
            .send({ message: "firstPrompt or title is required" });
        }

        const title =
          promptText.length > 30
            ? `${promptText.substring(0, 30).trim()}...`
            : promptText;

        const newSession = await SessionEntry.create({
          user_id: userId,
          title,
        });

        return reply.status(201).send(newSession);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Failed to create session" });
      }
    },
  );

  fastify.patch(
    "/sessions/:sessionId",
    async (
      request: FastifyRequest<{
        Params: { sessionId: string };
        Body: { title: string };
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const userId = await getUserIdFromAuthHeader(
          request.headers.authorization,
        );
        if (!userId) {
          return reply.status(401).send({ message: "Unauthorized" });
        }

        const { sessionId } = request.params;
        const { title } = request.body || {};

        if (!title || !title.trim()) {
          return reply
            .status(400)
            .send({ message: "A valid title is required" });
        }

        const [updatedRowsCount] = await SessionEntry.update(
          { title: title.trim() },
          {
            where: {
              session_id: sessionId,
              user_id: userId,
            },
          },
        );

        if (updatedRowsCount === 0) {
          return reply.status(404).send({ message: "Session not found" });
        }

        const updatedSession = await SessionEntry.findOne({
          where: { session_id: sessionId, user_id: userId },
        });

        return reply.send(updatedSession);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Failed to rename session" });
      }
    },
  );

  fastify.delete(
    "/sessions/:sessionId",
    async (
      request: FastifyRequest<{ Params: { sessionId: string } }>,
      reply: FastifyReply,
    ) => {
      try {
        const userId = await getUserIdFromAuthHeader(
          request.headers.authorization,
        );
        if (!userId) return reply.status(401).send({ message: "Unauthorized" });

        const { sessionId } = request.params;
        const deleted = await SessionEntry.destroy({
          where: { session_id: sessionId, user_id: userId },
        });

        if (!deleted) {
          return reply.status(404).send({ message: "Session not found" });
        }

        return reply.send({ message: "Session deleted successfully" });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Failed to delete session" });
      }
    },
  );
}

export default sessionRoutes;
