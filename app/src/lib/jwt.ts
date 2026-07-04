import jwt from "jsonwebtoken";

const JWT_EXPIRES_IN_SECONDS = Number.parseInt(process.env.JWT_EXPIRES_IN_SECONDS ?? "604800", 10);

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be set and contain at least 32 characters.");
  }

  return secret;
}

export type JwtPayload = {
  userId: string;
  email: string;
  role: string;
};

export function generateToken(payload: JwtPayload, expiresInSeconds?: number): string {
  const expiresIn = expiresInSeconds || JWT_EXPIRES_IN_SECONDS;
  return jwt.sign(payload, getJwtSecret(), { expiresIn });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as JwtPayload;
    return decoded;
  } catch {
    return null;
  }
}