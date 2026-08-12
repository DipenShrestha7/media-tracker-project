import Fastify from "fastify";
import cors from "@fastify/cors";
import dotenv from "dotenv";
import sequelize from "./config/db.js";
import libraryRoutes from "./routes/libraryRoute.js";
import loginRoutes from "./routes/loginRoute.js";
import messageRoutes from "./routes/messageRoute.js";
import sessionRoutes from "./routes/sessionRoute.js";

dotenv.config();

const normalizeOrigin = (value: unknown) => {
  if (!value || typeof value !== "string") return null;

  const trimmed = value.trim().replace(/^"|"$/g, "").replace(/\/$/, "");
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  return `https://${trimmed}`;
};

const buildCorsPlugin = (fastify: ReturnType<typeof Fastify>) => {
  const allowedOrigins = new Set(
    [
      "http://localhost:5173",
      process.env.WEBSITE_URL,
      process.env.FRONTEND_URL,
      process.env.VITE_WEBSITE_URL,
      process.env.VERCEL_URL,
    ]
      .map(normalizeOrigin)
      .filter(Boolean),
  );

  fastify.register(cors, {
    origin: (
      origin: string | undefined,
      cb: (err: Error | null, allow?: boolean) => void,
    ) => {
      const normalizedOrigin = normalizeOrigin(origin);

      if (
        !normalizedOrigin ||
        allowedOrigins.has(normalizedOrigin) ||
        normalizedOrigin.endsWith(".vercel.app")
      ) {
        cb(null, true);
        return;
      }
      cb(new Error("Not allowed by CORS"), false);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  });
};

export const buildServer = () => {
  const fastify = Fastify({ logger: true });
  buildCorsPlugin(fastify);
  fastify.register(libraryRoutes, { prefix: "/api" });
  fastify.register(loginRoutes, { prefix: "/api" });
  fastify.register(sessionRoutes, { prefix: "/api" });
  fastify.register(messageRoutes, { prefix: "/api" });
  return fastify;
};

const start = async () => {
  const fastify = buildServer();
  let shuttingDown = false;

  const shutdown = async () => {
    if (shuttingDown) return;
    shuttingDown = true;

    try {
      await fastify.close();
    } catch (error) {
      console.warn("Error while shutting down API server.", error);
    }
  };

  process.once("SIGINT", () => {
    void shutdown().finally(() => process.exit(0));
  });

  process.once("SIGTERM", () => {
    void shutdown().finally(() => process.exit(0));
  });

  try {
    await sequelize.authenticate();
    await sequelize.sync();
  } catch (err) {
    console.warn("Database unavailable; continuing without persistence.", err);
  }

  const port = Number(process.env.PORT || 8001);
  const host = process.env.HOST || "0.0.0.0";

  try {
    await fastify.listen({ port, host });
    console.log(`Server is running at http://${host}:${port}`);
  } catch (error) {
    await shutdown();
    throw error;
  }
};

if (process.env.NODE_ENV !== "test") {
  start().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
