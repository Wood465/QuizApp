import { pool } from "./db.js";
import { verifyToken } from "./jwt.js";

export function json(res, status, payload) {
  res.status(status).json(payload);
}

export function parseBody(req) {
  if (!req.body) {
    return {};
  }
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body;
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

export function normalizeNext(nextPath, fallback = "/dashboard") {
  if (!nextPath || typeof nextPath !== "string") {
    return fallback;
  }
  if (!nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return fallback;
  }
  return nextPath;
}

export function normalizeFrontendOrigin(origin, fallback) {
  if (!origin || typeof origin !== "string") {
    return fallback;
  }

  try {
    const parsed = new URL(origin);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return fallback;
    }
    return parsed.origin;
  } catch {
    return fallback;
  }
}

export async function getAuthUser(req) {
  const header = req.headers.authorization || "";
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
    return result.rowCount ? result.rows[0] : null;
  } catch {
    return null;
  }
}
