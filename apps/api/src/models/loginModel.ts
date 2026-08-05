import sequelize from "../config/db.js";
import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";

export interface UserAttributes extends Model<
  InferAttributes<UserAttributes>,
  InferCreationAttributes<UserAttributes>
> {
  id: CreationOptional<number>;
  username: string;
  email: string;
  password_hash: string;
}

const loginModel = sequelize.define<UserAttributes>(
  "Login",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    password_hash: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    timestamps: true,
  },
);

export default loginModel;
