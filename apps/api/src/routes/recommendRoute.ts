import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { RecommendationEntry } from "../models/recommendModel.js";
import { LibraryEntry } from "../models/libraryEntryModel.js";
import { verifyToken } from "../utils/jose.js";
import axios from "axios";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";
async function recommendRoute(fastify: FastifyInstance) {
  const getUserIdFromAuthHeader = async (authHeader?: string) => {
    if (!authHeader) return null;
    const token = authHeader.split(" ")[1];
    if (!token) return null;
    const decoded = await verifyToken(token);
    return decoded.userId;
  };

  fastify.post(
    "/api/recommendations",
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
        // 1. Fetch library from DB using auth context
        const userLibrary = await LibraryEntry.findOne({
          where: { userId: userId },
        });

        // 2. Call internal Python AI Service
        const aiResponse = await axios.post(
          `${AI_SERVICE_URL}/recommend`,
          {
            user_library: userLibrary,
          },
          {
            headers: { "X-Internal-Secret": process.env.INTERNAL_API_SECRET },
          },
        );

        // 3. Save recommendations to database
        await RecommendationEntry.create({
          user_id: userId,
          recommendations: aiResponse.data.recommendations,
        });

        return reply.status(200).send(aiResponse.data);
      } catch (error: any) {
        console.log(error);
        return reply.status(500).send({ error: error.message });
      }
    },
  );
}
export default recommendRoute;
