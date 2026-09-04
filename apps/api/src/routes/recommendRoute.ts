import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { RecommendationEntry } from "../models/recommendModel.js";
import { LibraryEntry } from "../models/libraryEntryModel.js";
import { verifyToken } from "../utils/jose.js";
import { hydrateMediaCandidates } from "../media.js";
import axios from "axios";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

const needsPosterHydration = (recs: unknown[]): boolean =>
  Array.isArray(recs) &&
  recs.length > 0 &&
  recs.some(
    (item) =>
      !item ||
      typeof item !== "object" ||
      !("posterUrl" in item) ||
      !(item as { posterUrl?: string }).posterUrl,
  );

async function recommendRoute(fastify: FastifyInstance) {
  const getUserIdFromAuthHeader = async (authHeader?: string) => {
    if (!authHeader) return null;
    const token = authHeader.split(" ")[1];
    if (!token) return null;
    const decoded = await verifyToken(token);
    return decoded.userId;
  };

  fastify.post(
    "/recommendations",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = await getUserIdFromAuthHeader(
          request.headers.authorization,
        );
        if (!userId) {
          return reply
            .code(401)
            .send({ message: "No token provided or invalid" });
        }

        const { refresh = false } = request.body as { refresh?: boolean };

        // Check if cached recommendations exist and are recent (less than 1 hour old)
        const cachedRecs = await RecommendationEntry.findOne({
          where: { user_id: userId },
        });

        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        const isCacheValid =
          cachedRecs &&
          cachedRecs.updatedAt &&
          cachedRecs.updatedAt > oneHourAgo &&
          !refresh;

        if (isCacheValid) {
          let cachedList = cachedRecs.recommendations ?? [];

          // Older cache may only have AI titles without posters — hydrate once.
          if (needsPosterHydration(cachedList)) {
            console.log(
              "[RECOMMEND] Hydrating cached recommendations for user:",
              userId,
            );
            cachedList = await hydrateMediaCandidates(
              cachedList as Array<{
                title?: string;
                year?: number | null;
                type?: string;
                source_hint?: string;
                source?: string;
                posterUrl?: string;
                id?: string;
                externalId?: string;
                rating?: number | null;
                genre?: string[];
              }>,
            );
            await cachedRecs.update({ recommendations: cachedList });
          }

          console.log(
            "[RECOMMEND] Returning cached recommendations for user:",
            userId,
          );
          return reply.status(200).send({
            recommendations: cachedList,
            cached: true,
          });
        }

        console.log(
          "[RECOMMEND] Generating fresh recommendations for user:",
          userId,
        );

        // 1. Fetch ALL library items for the user
        const userLibraryItems = await LibraryEntry.findAll({
          where: { userId: userId },
          attributes: [
            "id",
            "title",
            "type",
            "year",
            "genre",
            "rating",
            "status",
          ],
        });

        // 2. Format library items for AI service
        const formattedLibrary = userLibraryItems.map((item: any) => ({
          id: item.id,
          title: item.title,
          type: item.type,
          year: item.year,
          genres: Array.isArray(item.genre) ? item.genre : [],
          user_rating: item.rating,
          status: item.status,
        }));

        // 3. Call Python AI Service with library data
        const recommendUrl = `${AI_SERVICE_URL}/api/v1/recommend`;
        console.log("[RECOMMEND] Calling AI service at:", recommendUrl);
        const aiResponse = await axios.post(recommendUrl, {
          user_library: formattedLibrary,
        });

        const rawRecommendations =
          aiResponse.data.metadata?.recommendations || [];

        // 4. Resolve posters/ratings/ids via OMDb / AniList / TVMaze
        const newRecommendations =
          await hydrateMediaCandidates(rawRecommendations);

        // 5. Update or create recommendations in database
        if (cachedRecs) {
          await cachedRecs.update({
            recommendations: newRecommendations,
          });
          console.log("[RECOMMEND] Updated recommendations for user:", userId);
        } else {
          await RecommendationEntry.create({
            user_id: userId,
            recommendations: newRecommendations,
          });
          console.log(
            "[RECOMMEND] Created new recommendations for user:",
            userId,
          );
        }

        return reply.status(200).send({
          recommendations: newRecommendations,
          cached: false,
        });
      } catch (error: any) {
        console.error("Recommendation error:", error.message || error);
        return reply.status(500).send({ error: error.message });
      }
    },
  );

  fastify.get(
    "/recommendations",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = await getUserIdFromAuthHeader(
          request.headers.authorization,
        );
        if (!userId) {
          return reply
            .code(401)
            .send({ message: "No token provided or invalid" });
        }

        // Fetch cached recommendations
        const cached = await RecommendationEntry.findByPk(userId);
        if (!cached) {
          return reply
            .status(404)
            .send({ message: "No recommendations found" });
        }

        return reply.status(200).send(cached);
      } catch (error: any) {
        console.error("Fetch recommendations error:", error);
        return reply.status(500).send({ error: error.message });
      }
    },
  );
}

export default recommendRoute;
