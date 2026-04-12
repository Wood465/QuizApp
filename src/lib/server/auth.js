import jwt from "jsonwebtoken";
import { pool } from "./db.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

export function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: "7d" },
  );
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

export async function getAuthUserFromRequest(request) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return null;
  }

  try {
    const payload = verifyToken(token);
    const result = await pool.query(
      "SELECT id, name, email, role, provider FROM users WHERE id = $1 LIMIT 1",
      [payload.sub],
    );

    if (!result.rowCount) {
      return null;
    }

    return result.rows[0];
  } catch {
    return null;
  }
}

export function toPublicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    provider: user.provider,
  };
}

