import sequelize from "../config/db.js";
import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";

export interface ChatMessageAttributes extends Model<
  InferAttributes<ChatMessageAttributes>,
  InferCreationAttributes<ChatMessageAttributes>
> {
  conversationId: string;
  sender: "user" | "ai";
  content: string;
}

const chatMessage = sequelize.define<ChatMessageAttributes>("ChatMessage", {
  conversationId: {
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
});

export default chatMessage;
