import { DataTypes, Model, Sequelize } from "sequelize";

export type LibraryStatus = "PLAN_TO_WATCH" | "WATCHING" | "COMPLETED";

const databaseUrl = process.env.DATABASE_URL;
export const hasDatabase = Boolean(databaseUrl);

export const sequelize = databaseUrl
  ? new Sequelize(databaseUrl, {
      dialect: "postgres",
      logging: false,
    })
  : null;

export class LibraryEntry extends Model {
  declare id: string;
  declare externalId: string;
  declare title: string;
  declare type: string;
  declare posterUrl: string;
  declare rating: number | null;
  declare year: number | null;
  declare genre: string[];
  declare source: "OMDB" | "ANILIST" | "TVMAZE";
  declare status: LibraryStatus;
  declare completedAt: Date | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
  declare userId: number;
}

if (sequelize) {
  LibraryEntry.init(
    {
      id: {
        type: DataTypes.STRING,
        primaryKey: true,
      },
      externalId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      type: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      posterUrl: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      rating: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      year: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      genre: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: false,
        defaultValue: [],
      },
      source: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "PLAN_TO_WATCH",
      },
      completedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "Logins",
          key: "id",
        },
        onDelete: "CASCADE",
      },
    },
    {
      sequelize,
      tableName: "library_entries",
      modelName: "LibraryEntry",
      timestamps: true,
    },
  );
}
