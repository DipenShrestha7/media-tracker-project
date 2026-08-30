import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import sequelize from "../config/db.js";

export interface RecommendationItem {
  id: string;
  externalId: string;
  title: string;
  type: "movie" | "anime" | "series" | "manga" | "manhwa" | "kdrama";
  posterUrl: string;
  rating: number | null;
  year: number | null;
  genre: string[];
}

export class RecommendationEntry extends Model<
  InferAttributes<RecommendationEntry>,
  InferCreationAttributes<RecommendationEntry>
> {
  declare user_id: string;
  declare recommendations: CreationOptional<RecommendationItem[]>;
  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;
}

if (sequelize) {
  RecommendationEntry.init(
    {
      user_id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
      },
      recommendations: {
        type: DataTypes.JSONB,
        allowNull: false,
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
      tableName: "recommendation_entries",
      timestamps: true,
    },
  );
}
