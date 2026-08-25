import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { RecommendationEntry } from "../models/recommendModel.js";
import { LibraryEntry } from "../models/libraryEntryModel.js";
import { verifyToken } from "../utils/jose.js";
