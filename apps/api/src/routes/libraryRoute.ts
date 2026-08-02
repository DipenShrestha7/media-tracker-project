import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
  addToHistory,
  addToWatchlist,
  listHistoryItems,
  listLibraryItems,
  removeLibraryItem,
  updateLibraryStatus,
} from "../library.js";
import { z } from "zod";
import { hasDatabase } from "../database.js";
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

function libraryRoutes(fastify: FastifyInstance) {
  fastify.get("/health", async () => ({ ok: true }));

  fastify.get("/library", async () => {
    listLibraryItems();
  });

  fastify.get("/watchlist", async () => listLibraryItems());

  fastify.post("/watchlist", async (request, reply) => {
    if (!hasDatabase) {
      return reply.status(503).send({
        error:
          "DATABASE_URL is not configured. PostgreSQL persistence is unavailable.",
      });
    }

    const item = exploreItemSchema.parse(request.body);
    const savedItem = await addToWatchlist(item);

    return reply.status(201).send(savedItem);
  });

  fastify.get("/history", async () => listHistoryItems());

  fastify.post("/history", async (request, reply) => {
    if (!hasDatabase) {
      return reply.status(503).send({
        error:
          "DATABASE_URL is not configured. PostgreSQL persistence is unavailable.",
      });
    }

    const item = exploreItemSchema.parse(request.body);
    const savedItem = await addToHistory(item);

    return reply.status(201).send(savedItem);
  });

  fastify.delete("/library/:id", async (request, reply) => {
    if (!hasDatabase) {
      return reply.status(503).send({
        error:
          "DATABASE_URL is not configured. PostgreSQL persistence is unavailable.",
      });
    }

    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    const removed = await removeLibraryItem(params.id);

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

    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    const body = z.object({ status: statusSchema }).parse(request.body);
    const updatedItem = await updateLibraryStatus(params.id, body.status);

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

    try {
      const payload = await buildExploreResponse(searchTerm);
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
