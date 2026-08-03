import dotenv from "dotenv";
import { Sequelize } from "sequelize";

dotenv.config({ path: new URL("../../.env", import.meta.url) });

const databaseUrl = process.env.DATABASE_URL;
export const hasDatabase = Boolean(databaseUrl);

// Guard check: Throw early if DATABASE_URL is missing
if (!databaseUrl) {
  throw new Error(
    "Missing DATABASE_URL configuration in environment variables",
  );
}

const useSsl =
  process.env.NODE_ENV === "production" ||
  /neon\.tech/i.test(databaseUrl) ||
  process.env.PGSSL === "true";

const sequelize = new Sequelize(databaseUrl, {
  dialect: "postgres",
  logging: false,
  dialectOptions: useSsl
    ? {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      }
    : {},
});

export default sequelize;
