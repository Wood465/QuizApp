import bcrypt from "bcryptjs";
import { initDb, pool } from "../_lib/db.js";
import { signToken } from "../_lib/jwt.js";
import { json, parseBody, setAuthCookie, toPublicUser } from "../_lib/http.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return json(res, 405, { message: "Method Not Allowed" });
  }

  await initDb();
  const body = parseBody(req);
  const name = (body.name || "").trim();
  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";

  if (!name || !email || !password) {
    return json(res, 400, { message: "Name, email and password are required." });
  }

  if (password.length < 6) {
    return json(res, 400, { message: "Password must contain at least 6 characters." });
  }

  const existing = await pool.query("SELECT id FROM users WHERE email = $1 LIMIT 1", [email]);
  if (existing.rowCount) {
    return json(res, 409, { message: "User with this email already exists." });
  }

  const adminEmail = (process.env.ADMIN_EMAIL || "").toLowerCase();
  const role = adminEmail && email === adminEmail ? "admin" : "user";
  const passwordHash = await bcrypt.hash(password, 10);

  const created = await pool.query(
    `INSERT INTO users (name, email, password_hash, provider, role)
     VALUES ($1, $2, $3, 'password', $4)
     RETURNING id, name, email, avatar_url, role, provider`,
    [name, email, passwordHash, role],
  );

  const user = created.rows[0];
  const token = signToken(user);
  setAuthCookie(res, token);
  return json(res, 201, { user: toPublicUser(user) });
}
