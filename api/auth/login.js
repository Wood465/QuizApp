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
  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";

  if (!email || !password) {
    return json(res, 400, { message: "Email and password are required." });
  }

  const result = await pool.query(
    "SELECT id, name, email, role, provider, password_hash FROM users WHERE email = $1 LIMIT 1",
    [email],
  );

  if (!result.rowCount) {
    return json(res, 401, { message: "Invalid email or password." });
  }

  const user = result.rows[0];
  if (!user.password_hash) {
    return json(res, 400, { message: "Use Google login for this account." });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return json(res, 401, { message: "Invalid email or password." });
  }

  const token = signToken(user);
  setAuthCookie(res, token);
  return json(res, 200, { user: toPublicUser(user) });
}
