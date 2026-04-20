import bcrypt from "bcryptjs";
import { initDb, pool } from "../_lib/db.js";
import { signToken } from "../_lib/jwt.js";
import { getAuthUser, json, parseBody, setAuthCookie, toPublicUser } from "../_lib/http.js";

export default async function handler(req, res) {
  if (req.method !== "PUT") {
    return json(res, 405, { message: "Method Not Allowed" });
  }

  await initDb();
  const authUser = await getAuthUser(req);
  if (!authUser) {
    return json(res, 401, { message: "Invalid or expired token." });
  }

  const body = parseBody(req);
  const name = (body.name || "").trim();
  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";
  const rawAvatarUrl = typeof body.avatarUrl === "string" ? body.avatarUrl.trim() : "";
  let avatarUrl = "";

  if (rawAvatarUrl) {
    if (rawAvatarUrl.length > 500) {
      return json(res, 400, { message: "Avatar URL is too long." });
    }

    let parsed;
    try {
      parsed = new URL(rawAvatarUrl);
    } catch {
      return json(res, 400, { message: "Avatar URL must be a valid URL." });
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return json(res, 400, { message: "Avatar URL must start with http:// or https://." });
    }

    avatarUrl = parsed.toString();
  }

  if (!name || !email) {
    return json(res, 400, { message: "Name and email are required." });
  }

  const conflict = await pool.query(
    "SELECT id FROM users WHERE email = $1 AND id <> $2 LIMIT 1",
    [email, authUser.id],
  );

  if (conflict.rowCount) {
    return json(res, 409, { message: "Email is already in use." });
  }

  let passwordHash = null;
  if (authUser.provider === "google" && password.trim()) {
    return json(res, 400, { message: "Google uporabniki ne morejo spremeniti gesla tukaj." });
  }

  if (password.trim()) {
    if (password.trim().length < 6) {
      return json(res, 400, { message: "Password must contain at least 6 characters." });
    }
    passwordHash = await bcrypt.hash(password.trim(), 10);
  }

  const updated = await pool.query(
    `UPDATE users
     SET name = $1,
         email = $2,
         password_hash = COALESCE($3, password_hash),
         avatar_url = NULLIF($4, '')
     WHERE id = $5
     RETURNING id, name, email, avatar_url, role, provider`,
    [name, email, passwordHash, avatarUrl, authUser.id],
  );

  const user = updated.rows[0];
  setAuthCookie(res, signToken(user));
  return json(res, 200, { user: toPublicUser(user) });
}
