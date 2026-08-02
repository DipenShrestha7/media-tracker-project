import { SignJWT, jwtVerify } from "jose";

const SECRET_KEY = new TextEncoder().encode(process.env.JOSE_SECRET_KEY);

export async function generateToken(payload: {
  userId: number;
  email: string;
}) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h") // Token expires in 24 hours
    .sign(SECRET_KEY);
}

export async function verifyToken(token: string) {
  const { payload } = await jwtVerify(token, SECRET_KEY);
  return payload;
}
