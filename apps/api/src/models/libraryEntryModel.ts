import sequelize from "../config/db.js";
import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";

export type LibraryStatus = "PLAN_TO_WATCH" | "WATCHING" | "COMPLETED";

export class LibraryEntry extends Model<
  InferAttributes<LibraryEntry>,
  InferCreationAttributes<LibraryEntry>
> {
  declare id: string;
  declare externalId: string;
  declare userId: string;
  declare title: string;
  declare type: string;
  declare posterUrl: string;
  declare rating: number | null;
  declare year: number | null;
  declare genre: string[];
  declare source: "OMDB" | "ANILIST" | "TVMAZE";
  declare status: LibraryStatus;
  declare completedAt: Date | null;
  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;
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
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "login_entries",
          key: "id",
        },
        onDelete: "CASCADE",
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
      createdAt: {
        type: DataTypes.DATE,
      },
      updatedAt: {
        type: DataTypes.DATE,
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
