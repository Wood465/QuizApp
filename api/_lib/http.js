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

export function parseCookies(req) {
  const raw = req.headers.cookie || "";
  const out = {};

  raw.split(";").forEach((chunk) => {
    const [k, ...rest] = chunk.trim().split("=");
    if (!k) {
      return;
    }
    out[k] = decodeURIComponent(rest.join("=") || "");
  });

  return out;
}

export function setAuthCookie(res, token) {
  const isProd = process.env.NODE_ENV === "production";
  const cookie = [
    `auth_token=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    isProd ? "Secure" : "",
    "Max-Age=604800",
  ]
    .filter(Boolean)
    .join("; ");

  res.setHeader("Set-Cookie", cookie);
}

export function clearAuthCookie(res) {
  const isProd = process.env.NODE_ENV === "production";
  const cookie = [
    "auth_token=",
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    isProd ? "Secure" : "",
    "Max-Age=0",
  ]
    .filter(Boolean)
    .join("; ");

  res.setHeader("Set-Cookie", cookie);
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
  const headerToken = header.startsWith("Bearer ") ? header.slice(7) : null;
  const cookieToken = parseCookies(req).auth_token || null;
  const token = headerToken || cookieToken;

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
