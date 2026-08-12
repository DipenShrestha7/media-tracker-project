import sequelize from "../config/db.js";
import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";

export class SessionEntry extends Model<
  InferAttributes<SessionEntry>,
  InferCreationAttributes<SessionEntry>
> {
  declare session_id: CreationOptional<string>;
  declare user_id: string;
  declare title: string;
  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;
}

if (sequelize) {
  SessionEntry.init(
    {
      session_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        primaryKey: true,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "Logins",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      title: {
        type: DataTypes.STRING,
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
      tableName: "session_entries",
      modelName: "SessionEntry",
      timestamps: true,
    },
  );
}
