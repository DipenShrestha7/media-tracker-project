import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
  addToLibrary,
  getLibraryIds,
  listLibraryItems,
  removeLibraryItem,
  updateLibraryStatus,
} from "../library.js";
import { z } from "zod";
import { jwtVerify } from "jose";
import { hasDatabase } from "../config/db.js";
import { buildExploreResponse } from "../media.js";

const exploreItemSchema = z.object({
  id: z.string().min(1),
  externalId: z.string().min(1),
  title: z.string().min(1),
  type: z.enum(["MOVIE", "TV_SHOW", "ANIME", "MANGA", "MANHWA", "KDRAMA"]),
  posterUrl: z.string().min(1),
  rating: z
    .number()
    .nullable()
    .optional()
    .transform((value) => value ?? undefined),
  year: z
    .number()
    .nullable()
    .optional()
    .transform((value) => value ?? undefined),
  genre: z.array(z.string()),
  source: z.enum(["OMDB", "ANILIST", "TVMAZE"]),
});

const statusSchema = z.enum(["PLAN_TO_WATCH", "WATCHING", "COMPLETED"]);
const JOSE_SECRET_KEY = new TextEncoder().encode(
  process.env.JOSE_SECRET_KEY || "your-fallback-secret-key",
);

const getAuthUserId = async (
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<string | null> => {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    reply
      .status(401)
      .send({ error: "Unauthorized: Missing or invalid authorization token" });
    return null;
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    reply.status(401).send({ error: "Unauthorized: Malformed token" });
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, JOSE_SECRET_KEY);
    const userId = (payload.userId || payload.id || payload.sub) as
      | string
      | undefined;

    if (!userId) {
      reply.status(401).send({ error: "Unauthorized: Invalid token payload" });
      return null;
    }

    return userId;
  } catch (error) {
    reply
      .status(401)
      .send({ error: "Unauthorized: Token verification failed or expired" });
    return null;
  }
};

function libraryRoutes(fastify: FastifyInstance) {
  fastify.get("/health", async () => ({ ok: true }));

  fastify.get("/library", async (request, reply) => {
    const userId = await getAuthUserId(request, reply);
    if (!userId) return;
    return listLibraryItems(userId);
  });

  fastify.post(
    "/library",
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!hasDatabase) {
        return reply.status(503).send({
          error:
            "DATABASE_URL is not configured. PostgreSQL persistence is unavailable.",
        });
      }
      const userId = await getAuthUserId(request, reply);
      if (!userId) return;
      const item = exploreItemSchema.parse(request.body);
      const savedItem = await addToLibrary(item, userId);

      return reply.status(201).send(savedItem);
    },
  );

  fastify.delete("/library/:id", async (request, reply) => {
    if (!hasDatabase) {
      return reply.status(503).send({
        error:
          "DATABASE_URL is not configured. PostgreSQL persistence is unavailable.",
      });
    }
    const userId = await getAuthUserId(request, reply);
    if (!userId) return;
    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    const removed = await removeLibraryItem(params.id, userId);
    if (!removed) {
      return reply.status(404).send({ error: "Library item not found." });
    }
    return reply.status(204).send();
  });

  fastify.patch("/library/:id", async (request, reply) => {
    if (!hasDatabase) {
      return reply.status(503).send({
        error:
          "DATABASE_URL is not configured. PostgreSQL persistence is unavailable.",
      });
    }
    const userId = await getAuthUserId(request, reply);
    if (!userId) return;
    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    const body = z.object({ status: statusSchema }).parse(request.body);
    const updatedItem = await updateLibraryStatus(
      params.id,
      body.status,
      userId,
    );
    if (!updatedItem) {
      return reply.status(404).send({ error: "Library item not found." });
    }
    return updatedItem;
  });

  fastify.get("/explore", async (request, reply) => {
    const querySchema = z.object({
      q: z.string().optional(),
      search: z.string().optional(),
    });

    const query = querySchema.parse(request.query);
    const searchTerm = query.q?.trim() || query.search?.trim() || undefined;

    // Optional auth — don't error if missing, just skip inLibrary enrichment
    let userId: string | undefined;
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      if (token) {
        try {
          const { payload } = await jwtVerify(token, JOSE_SECRET_KEY);
          userId = (payload.userId || payload.id || payload.sub) as
            | string
            | undefined;
        } catch {
          // Invalid token — continue without userId
        }
      }
    }

    try {
      const libraryIds =
        userId && hasDatabase
          ? await getLibraryIds(userId).catch(() => new Set<string>())
          : undefined;
      const payload = await buildExploreResponse(searchTerm, libraryIds);
      return reply.send(payload);
    } catch (error) {
      reply.status(500);
      return {
        error:
          error instanceof Error
            ? error.message
            : "Failed to build explore data.",
      };
    }
  });
}

export default libraryRoutes;
