import sequelize from "../config/db.js";
import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";

export class MessageEntry extends Model<
  InferAttributes<MessageEntry>,
  InferCreationAttributes<MessageEntry>
> {
  declare message_id: CreationOptional<string>;
  declare session_id: string;
  declare sender: "user" | "ai";
  declare content: string;
  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;
}

if (sequelize) {
  MessageEntry.init(
    {
      message_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        primaryKey: true,
      },
      session_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      sender: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      content: {
        type: DataTypes.TEXT,
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
      tableName: "message_entries",
      modelName: "MessageEntry",
      timestamps: true,
    },
  );
}
