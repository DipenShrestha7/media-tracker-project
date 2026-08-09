import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { hash, verify } from "@node-rs/argon2";
import { LoginEntry } from "../models/loginModel.js";
import { generateToken, verifyToken } from "../utils/jose.js";
import type { SignupBody, LoginBody } from "../types/auth.js";

async function loginRoutes(fastify: FastifyInstance) {
  const getUserIdFromAuthHeader = async (authHeader?: string) => {
    if (!authHeader) return null;
    const token = authHeader.split(" ")[1];
    if (!token) return null;
    const decoded = await verifyToken(token);
    return decoded.userId;
  };

  fastify.post(
    "/signup",
    async (
      request: FastifyRequest<{ Body: SignupBody }>,
      reply: FastifyReply,
    ) => {
      try {
        const { username, email, password } = request.body;

        if (!username || !email || !password) {
          fastify.log.warn(
            {
              email,
              hasUsername: Boolean(username),
              hasPassword: Boolean(password),
            },
            "Signup rejected: missing required fields",
          );
          return reply
            .status(400)
            .send({ message: "Username, email, and password are required" });
        }

        if (password.length < 8) {
          fastify.log.warn(
            { email, passwordLength: password.length },
            "Signup rejected: password too short",
          );
          return reply
            .status(400)
            .send({ message: "Password must be at least 8 characters long" });
        }

        const existingUser = await LoginEntry.findOne({ where: { email } });
        if (existingUser) {
          fastify.log.warn(
            { email },
            "Signup rejected: account already exists",
          );
          return reply
            .status(409)
            .send({ message: "An account with this email already exists" });
        }

        const hashedPassword = await hash(password);
        const newUser = await LoginEntry.create({
          username,
          email,
          password_hash: hashedPassword,
        });

        const token = await generateToken({
          userId: newUser.id,
          email: newUser.email,
        });

        return reply.status(201).send({
          message: "User registered successfully",
          token,
          user: {
            id: newUser.id,
            username: newUser.username,
            email: newUser.email,
          },
        });
      } catch (error) {
        fastify.log.error(
          { err: error, email: request.body?.email },
          "Signup failed",
        );
        return reply.status(500).send({ message: "Internal server error" });
      }
    },
  );
  fastify.post(
    "/login",
    async (
      request: FastifyRequest<{ Body: LoginBody }>,
      reply: FastifyReply,
    ) => {
      try {
        const { email, password } = request.body;

        if (!email || !password) {
          fastify.log.warn(
            { email, hasPassword: Boolean(password) },
            "Login rejected: missing required fields",
          );
          return reply
            .status(400)
            .send({ message: "Email and password are required" });
        }

        const user = await LoginEntry.findOne({ where: { email } });

        if (!user) {
          fastify.log.warn({ email }, "Login rejected: user not found");
          return reply
            .status(401)
            .send({ message: "Invalid email or password" });
        }

        const isPasswordValid = await verify(user.password_hash, password);

        if (!isPasswordValid) {
          fastify.log.warn({ email }, "Login rejected: invalid password");
          return reply
            .status(401)
            .send({ message: "Invalid email or password" });
        }

        const token = await generateToken({
          userId: user.id,
          email: user.email,
        });

        return reply.status(200).send({
          message: "Login successful",
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
          },
        });
      } catch (error) {
        fastify.log.error(
          { err: error, email: request.body?.email },
          "Login failed",
        );
        return reply.status(500).send({ message: "Internal server error" });
      }
    },
  );

  fastify.get("/getuser", async (req, reply) => {
    try {
      const userId = await getUserIdFromAuthHeader(req.headers.authorization);
      if (!userId) {
        return reply
          .code(401)
          .send({ message: "No token provided or invalid" });
      }

      const user = await LoginEntry.findOne({
        where: { id: userId },
      });

      if (!user) {
        return reply.code(404).send({ message: "User not found" });
      }

      return reply.status(200).send({
        id: user.id,
        name: user.username,
        email: user.email,
      });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(401).send({ message: "Invalid or expired token" });
    }
  });
}

export default loginRoutes;
