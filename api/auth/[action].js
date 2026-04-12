import bcrypt from "bcryptjs";
import { initDb, pool } from "../_lib/db.js";
import { signToken } from "../_lib/jwt.js";
import {
  clearAuthCookie,
  getAuthUser,
  json,
  parseBody,
  setAuthCookie,
  toPublicUser,
} from "../_lib/http.js";

async function register(req, res) {
  if (req.method !== "POST") {
    return json(res, 405, { message: "Method Not Allowed" });
  }

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
     RETURNING id, name, email, role, provider`,
    [name, email, passwordHash, role],
  );

  const user = created.rows[0];
  const token = signToken(user);
  setAuthCookie(res, token);
  return json(res, 201, { user: toPublicUser(user) });
}

async function login(req, res) {
  if (req.method !== "POST") {
    return json(res, 405, { message: "Method Not Allowed" });
  }

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

async function me(req, res) {
  if (req.method !== "GET") {
    return json(res, 405, { message: "Method Not Allowed" });
  }

  const user = await getAuthUser(req);
  if (!user) {
    return json(res, 401, { message: "Invalid or expired token." });
  }

  return json(res, 200, { user: toPublicUser(user) });
}

async function profile(req, res) {
  if (req.method !== "PUT") {
    return json(res, 405, { message: "Method Not Allowed" });
  }

  const authUser = await getAuthUser(req);
  if (!authUser) {
    return json(res, 401, { message: "Invalid or expired token." });
  }

  const body = parseBody(req);
  const name = (body.name || "").trim();
  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";

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
         password_hash = COALESCE($3, password_hash)
     WHERE id = $4
     RETURNING id, name, email, role, provider`,
    [name, email, passwordHash, authUser.id],
  );

  const user = updated.rows[0];
  setAuthCookie(res, signToken(user));
  return json(res, 200, { user: toPublicUser(user) });
}

function logout(req, res) {
  if (req.method !== "POST") {
    return json(res, 405, { message: "Method Not Allowed" });
  }

  clearAuthCookie(res);
  return json(res, 200, { ok: true });
}

export default async function handler(req, res) {
  await initDb();

  const action = req.query.action;

  switch (action) {
    case "register":
      return register(req, res);
    case "login":
      return login(req, res);
    case "me":
      return me(req, res);
    case "profile":
      return profile(req, res);
    case "logout":
      return logout(req, res);
    default:
      return json(res, 404, { message: "Not Found" });
  }
}
