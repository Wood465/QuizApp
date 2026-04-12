import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import { initDb, pool } from "./db.js";
import { requireAdmin, requireAuth } from "./middleware/auth.js";
import { signToken } from "./utils/jwt.js";

dotenv.config({ path: "server/.env" });
dotenv.config();

const app = express();
const port = Number(process.env.PORT || 4000);
const adminEmail = (process.env.ADMIN_EMAIL || "").toLowerCase();
const googleClientId = process.env.GOOGLE_CLIENT_ID || "";
const googleClient = googleClientId ? new OAuth2Client(googleClientId) : null;

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
  }),
);
app.use(express.json());

function normalizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    provider: user.provider,
  };
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

  const passwordHash = await bcrypt.hash(password, 10);
  const role = adminEmail && email === adminEmail ? "admin" : "user";

  const created = await pool.query(
    `INSERT INTO users (name, email, password_hash, provider, role)
     VALUES ($1, $2, $3, 'password', $4)
     RETURNING id, name, email, role, provider`,
    [name, email, passwordHash, role],
  );

  const user = created.rows[0];
  const token = signToken(user);
  return res.status(201).json({ token, user: normalizeUser(user) });
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

  const token = signToken(user);
  return res.json({ token, user: normalizeUser(user) });
});

app.post("/api/auth/google", async (req, res) => {
  if (!googleClient) {
    return res.status(500).json({ message: "Missing GOOGLE_CLIENT_ID on server." });
  }

  const idToken = req.body.idToken || "";
  if (!idToken) {
    return res.status(400).json({ message: "Missing Google ID token." });
  }

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: googleClientId,
    });
    payload = ticket.getPayload();
  } catch {
    return res.status(401).json({ message: "Invalid Google token." });
  }

  const email = (payload?.email || "").toLowerCase();
  const name = payload?.name || email.split("@")[0] || "Uporabnik";

  if (!email) {
    return res.status(400).json({ message: "Google account email is missing." });
  }

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
  return res.json({ token, user: normalizeUser(user) });
});

app.get("/api/auth/me", requireAuth, async (req, res) => {
  return res.json({ user: normalizeUser(req.user) });
});

app.put("/api/auth/profile", requireAuth, async (req, res) => {
  const name = (req.body.name || "").trim();
  const email = (req.body.email || "").trim().toLowerCase();
  const password = req.body.password || "";

  if (!name || !email) {
    return res.status(400).json({ message: "Name and email are required." });
  }

  const conflict = await pool.query(
    "SELECT id FROM users WHERE email = $1 AND id <> $2 LIMIT 1",
    [email, req.user.id],
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

  const role = adminEmail && email === adminEmail ? "admin" : req.user.role;

  const updated = await pool.query(
    `UPDATE users
     SET name = $1,
         email = $2,
         role = $3,
         password_hash = COALESCE($4, password_hash)
     WHERE id = $5
     RETURNING id, name, email, role, provider`,
    [name, email, role, passwordHash, req.user.id],
  );

  const user = updated.rows[0];
  const token = signToken(user);
  return res.json({ token, user: normalizeUser(user) });
});

app.get("/api/users", requireAuth, requireAdmin, async (_req, res) => {
  const users = await pool.query(
    "SELECT id, name, email, role, provider FROM users ORDER BY name ASC",
  );
  return res.json({ users: users.rows.map(normalizeUser) });
});

app.delete("/api/users/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = req.params.id;
  const deleted = await pool.query("DELETE FROM users WHERE id = $1 RETURNING id", [id]);

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
  .catch((error) => {
    console.error("Failed to initialize DB", error);
    process.exit(1);
  });
