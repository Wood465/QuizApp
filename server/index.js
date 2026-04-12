import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import { initDb, pool } from "./db.js";
import { signToken, verifyToken } from "./jwt.js";

dotenv.config({ path: "server/.env" });
dotenv.config();

const app = express();
const port = Number(process.env.PORT || 4000);
const frontendUrl = process.env.FRONTEND_URL || process.env.CORS_ORIGIN || "http://localhost:5173";

app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:5173" }));
app.use(express.json());

function toPublicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    provider: user.provider,
  };
}

async function getAuthUser(req) {
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

function normalizeNext(nextPath, fallback = "/dashboard") {
  if (!nextPath || typeof nextPath !== "string") {
    return fallback;
  }
  if (!nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return fallback;
  }
  return nextPath;
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/auth/register", async (req, res) => {
  const name = (req.body.name || "").trim();
  const email = (req.body.email || "").trim().toLowerCase();
  const password = req.body.password || "";

  if (!name || !email || !password) {
    return res.status(400).json({ message: "Name, email and password are required." });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: "Password must contain at least 6 characters." });
  }

  const existing = await pool.query("SELECT id FROM users WHERE email = $1 LIMIT 1", [email]);
  if (existing.rowCount) {
    return res.status(409).json({ message: "User with this email already exists." });
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
  return res.status(201).json({ token: signToken(user), user: toPublicUser(user) });
});

app.post("/api/auth/login", async (req, res) => {
  const email = (req.body.email || "").trim().toLowerCase();
  const password = req.body.password || "";

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  const result = await pool.query(
    "SELECT id, name, email, role, provider, password_hash FROM users WHERE email = $1 LIMIT 1",
    [email],
  );

  if (!result.rowCount) {
    return res.status(401).json({ message: "Invalid email or password." });
  }

  const user = result.rows[0];
  if (!user.password_hash) {
    return res.status(400).json({ message: "Use Google login for this account." });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ message: "Invalid email or password." });
  }

  return res.json({ token: signToken(user), user: toPublicUser(user) });
});

app.get("/api/auth/google/start", async (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || "";

  if (!clientId || !clientSecret || !redirectUri) {
    return res.status(500).json({ message: "Missing Google OAuth configuration." });
  }

  const nextPath = normalizeNext(req.query.next, "/dashboard");
  const state = Buffer.from(JSON.stringify({ nextPath }), "utf8").toString("base64url");

  const oauth = new OAuth2Client(clientId, clientSecret, redirectUri);
  const url = oauth.generateAuthUrl({
    access_type: "offline",
    scope: ["openid", "email", "profile"],
    include_granted_scopes: true,
    prompt: "consent",
    state,
  });

  return res.redirect(url);
});

app.get("/api/auth/google/callback", async (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || "";
  const frontendLoginUrl = `${frontendUrl}/login`;

  if (!clientId || !clientSecret || !redirectUri) {
    return res.redirect(`${frontendLoginUrl}?error=google_config`);
  }

  const code = req.query.code || "";
  const rawState = req.query.state || "";

  let nextPath = "/dashboard";
  try {
    const parsed = JSON.parse(Buffer.from(rawState, "base64url").toString("utf8"));
    nextPath = normalizeNext(parsed?.nextPath, "/dashboard");
  } catch {
    nextPath = "/dashboard";
  }

  if (!code) {
    return res.redirect(`${frontendLoginUrl}?error=google_code`);
  }

  const oauth = new OAuth2Client(clientId, clientSecret, redirectUri);

  let payload;
  try {
    const { tokens } = await oauth.getToken({ code, redirect_uri: redirectUri });
    const idToken = tokens.id_token;
    if (!idToken) {
      return res.redirect(`${frontendLoginUrl}?error=google_id_token`);
    }

    const ticket = await oauth.verifyIdToken({ idToken, audience: clientId });
    payload = ticket.getPayload();
  } catch {
    return res.redirect(`${frontendLoginUrl}?error=google_verify`);
  }

  const email = (payload?.email || "").toLowerCase();
  const name = payload?.name || email.split("@")[0] || "Uporabnik";

  if (!email) {
    return res.redirect(`${frontendLoginUrl}?error=google_email`);
  }

  const adminEmail = (process.env.ADMIN_EMAIL || "").toLowerCase();
  const role = adminEmail && email === adminEmail ? "admin" : "user";

  const upserted = await pool.query(
    `INSERT INTO users (name, email, provider, role)
     VALUES ($1, $2, 'google', $3)
     ON CONFLICT (email)
     DO UPDATE SET
       name = EXCLUDED.name,
       provider = 'google',
       role = users.role
     RETURNING id, name, email, role, provider`,
    [name, email, role],
  );

  const user = upserted.rows[0];
  const token = signToken(user);
  return res.redirect(
    `${frontendLoginUrl}?token=${encodeURIComponent(token)}&next=${encodeURIComponent(nextPath)}`,
  );
});

app.get("/api/auth/me", async (req, res) => {
  const user = await getAuthUser(req);
  if (!user) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }

  return res.json({ user: toPublicUser(user) });
});

app.put("/api/auth/profile", async (req, res) => {
  const authUser = await getAuthUser(req);
  if (!authUser) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }

  const name = (req.body.name || "").trim();
  const email = (req.body.email || "").trim().toLowerCase();
  const password = req.body.password || "";

  if (!name || !email) {
    return res.status(400).json({ message: "Name and email are required." });
  }

  const conflict = await pool.query(
    "SELECT id FROM users WHERE email = $1 AND id <> $2 LIMIT 1",
    [email, authUser.id],
  );

  if (conflict.rowCount) {
    return res.status(409).json({ message: "Email is already in use." });
  }

  let passwordHash = null;
  if (password.trim()) {
    if (password.trim().length < 6) {
      return res.status(400).json({ message: "Password must contain at least 6 characters." });
    }
    passwordHash = await bcrypt.hash(password.trim(), 10);
  }

  const adminEmail = (process.env.ADMIN_EMAIL || "").toLowerCase();
  const role = adminEmail && email === adminEmail ? "admin" : authUser.role;

  const updated = await pool.query(
    `UPDATE users
     SET name = $1,
         email = $2,
         role = $3,
         password_hash = COALESCE($4, password_hash)
     WHERE id = $5
     RETURNING id, name, email, role, provider`,
    [name, email, role, passwordHash, authUser.id],
  );

  const user = updated.rows[0];
  return res.json({ token: signToken(user), user: toPublicUser(user) });
});

app.get("/api/users", async (req, res) => {
  const authUser = await getAuthUser(req);
  if (!authUser) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
  if (authUser.role !== "admin") {
    return res.status(403).json({ message: "Admin access required." });
  }

  const users = await pool.query("SELECT id, name, email, role, provider FROM users ORDER BY name ASC");
  return res.json({ users: users.rows.map(toPublicUser) });
});

app.delete("/api/users/:id", async (req, res) => {
  const authUser = await getAuthUser(req);
  if (!authUser) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
  if (authUser.role !== "admin") {
    return res.status(403).json({ message: "Admin access required." });
  }

  const userId = req.params.id;
  const deleted = await pool.query("DELETE FROM users WHERE id = $1 RETURNING id", [userId]);
  if (!deleted.rowCount) {
    return res.status(404).json({ message: "User not found." });
  }

  return res.json({ ok: true });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  return res.status(500).json({ message: "Internal server error." });
});

initDb()
  .then(() => {
    app.listen(port, () => {
      console.log(`API running on http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error("Failed to init DB", err);
    process.exit(1);
  });
