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
const DURATION_FALLBACK = 2147483647;

const allowedOrigin = process.env.CORS_ORIGIN || "http://localhost:5173";
app.use(
  cors({
    origin: allowedOrigin,
    credentials: true,
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
  }),
);
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && origin === allowedOrigin) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Vary", "Origin");
  }
  if (req.method === "OPTIONS") {
    res.header(
      "Access-Control-Allow-Headers",
      req.headers["access-control-request-headers"] || "Content-Type, Authorization",
    );
    return res.sendStatus(204);
  }
  return next();
});
app.use(express.json());

function toPublicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatar_url || user.avatarUrl || "",
    role: user.role,
    provider: user.provider,
  };
}

function normalizeAvatarUrl(value) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) {
    return "";
  }

  if (raw.length > 500) {
    throw new Error("Avatar URL is too long.");
  }

  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("Avatar URL must be a valid URL.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Avatar URL must start with http:// or https://.");
  }

  return parsed.toString();
}

function parseQuizIds(input) {
  if (typeof input !== "string") {
    return [];
  }

  return input
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

async function getLeaderboardsByQuizIds(authUserId, quizIds) {
  if (!quizIds.length) {
    return [];
  }

  const rows = await pool.query(
    `
      WITH user_best AS (
        SELECT
          r.id,
          r.user_id,
          r.quiz_id,
          r.quiz_title,
          r.score,
          r.total,
          r.percentage,
          r.duration_seconds,
          r.created_at,
          ROW_NUMBER() OVER (
            PARTITION BY r.quiz_id, r.user_id
            ORDER BY
              r.percentage DESC,
              r.score DESC,
              CASE
                WHEN r.duration_seconds > 0 THEN r.duration_seconds
                ELSE $2
              END ASC,
              r.created_at ASC,
              r.id ASC
          ) AS user_attempt_rank
        FROM results r
        WHERE r.quiz_id = ANY($1::text[])
      ),
      best_results AS (
        SELECT *
        FROM user_best
        WHERE user_attempt_rank = 1
      ),
      ranked AS (
        SELECT
          b.id,
          b.user_id,
          b.quiz_id,
          b.quiz_title,
          b.score,
          b.total,
          b.percentage,
          b.duration_seconds,
          b.created_at,
          u.name AS user_name,
          ROW_NUMBER() OVER (
            PARTITION BY b.quiz_id
            ORDER BY
              b.percentage DESC,
              b.score DESC,
              CASE
                WHEN b.duration_seconds > 0 THEN b.duration_seconds
                ELSE $2
              END ASC,
              b.created_at ASC,
              b.id ASC
          ) AS rank_position,
          COUNT(*) OVER (PARTITION BY b.quiz_id) AS total_participants
        FROM best_results b
        JOIN users u ON u.id = b.user_id
      )
      SELECT
        quiz_id,
        quiz_title,
        user_id,
        user_name,
        score,
        total,
        percentage,
        duration_seconds,
        created_at,
        rank_position,
        total_participants
      FROM ranked
      ORDER BY quiz_id ASC, rank_position ASC
    `,
    [quizIds, DURATION_FALLBACK],
  );

  const byQuiz = new Map();

  for (const row of rows.rows) {
    if (!byQuiz.has(row.quiz_id)) {
      byQuiz.set(row.quiz_id, {
        quizId: row.quiz_id,
        quizTitle: row.quiz_title,
        totalParticipants: Number(row.total_participants) || 0,
        userRank: null,
        top10: [],
      });
    }

    const group = byQuiz.get(row.quiz_id);

    if (row.user_id === authUserId) {
      group.userRank = Number(row.rank_position) || null;
    }

    if (Number(row.rank_position) <= 10) {
      group.top10.push({
        rank: Number(row.rank_position),
        name: row.user_name,
        percentage: Number(row.percentage),
        score: Number(row.score),
        total: Number(row.total),
        durationSeconds: Number(row.duration_seconds) || 0,
      });
    }
  }

  return quizIds.map((quizId) => {
    const group = byQuiz.get(quizId);
    if (group) {
      return group;
    }

    return {
      quizId,
      quizTitle: "",
      totalParticipants: 0,
      userRank: null,
      top10: [],
    };
  });
}

function parseCookies(req) {
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

function setAuthCookie(res, token) {
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

function clearAuthCookie(res) {
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

async function getAuthUser(req) {
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
      "SELECT id, name, email, avatar_url, role, provider FROM users WHERE id = $1 LIMIT 1",
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

function normalizeFrontendOrigin(origin, fallback) {
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
     RETURNING id, name, email, avatar_url, role, provider`,
    [name, email, passwordHash, role],
  );

  const user = created.rows[0];
  setAuthCookie(res, signToken(user));
  return res.status(201).json({ user: toPublicUser(user) });
});

app.post("/api/auth/login", async (req, res) => {
  const email = (req.body.email || "").trim().toLowerCase();
  const password = req.body.password || "";

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  const result = await pool.query(
    "SELECT id, name, email, avatar_url, role, provider, password_hash FROM users WHERE email = $1 LIMIT 1",
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

  setAuthCookie(res, signToken(user));
  return res.json({ user: toPublicUser(user) });
});

app.post("/api/auth/logout", (_req, res) => {
  clearAuthCookie(res);
  return res.json({ ok: true });
});

app.get("/api/auth/google/start", async (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || "";

  if (!clientId || !clientSecret || !redirectUri) {
    return res.status(500).json({ message: "Missing Google OAuth configuration." });
  }

  const nextPath = normalizeNext(req.query.next, "/dashboard");
  const frontendOrigin = normalizeFrontendOrigin(req.query.frontend, frontendUrl);
  const state = Buffer.from(JSON.stringify({ nextPath, frontendOrigin }), "utf8").toString(
    "base64url",
  );

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
  let resolvedFrontend = frontendUrl;

  if (!clientId || !clientSecret || !redirectUri) {
    return res.redirect(`${resolvedFrontend}/login?error=google_config`);
  }

  const code = req.query.code || "";
  const rawState = req.query.state || "";

  let nextPath = "/dashboard";
  try {
    const parsed = JSON.parse(Buffer.from(rawState, "base64url").toString("utf8"));
    nextPath = normalizeNext(parsed?.nextPath, "/dashboard");
    resolvedFrontend = normalizeFrontendOrigin(parsed?.frontendOrigin, frontendUrl);
  } catch {
    nextPath = "/dashboard";
  }

  const frontendLoginUrl = `${resolvedFrontend}/login`;

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
  const rawGoogleAvatar = typeof payload?.picture === "string" ? payload.picture.trim() : "";
  const googleAvatarUrl =
    rawGoogleAvatar &&
    (rawGoogleAvatar.startsWith("https://") || rawGoogleAvatar.startsWith("http://"))
      ? rawGoogleAvatar
      : "";

  if (!email) {
    return res.redirect(`${frontendLoginUrl}?error=google_email`);
  }

  const adminEmail = (process.env.ADMIN_EMAIL || "").toLowerCase();
  const role = adminEmail && email === adminEmail ? "admin" : "user";

  const upserted = await pool.query(
    `INSERT INTO users (name, email, provider, role, avatar_url)
     VALUES ($1, $2, 'google', $3, NULLIF($4, ''))
     ON CONFLICT (email)
     DO UPDATE SET
       name = EXCLUDED.name,
       provider = 'google',
       avatar_url = CASE
         WHEN users.avatar_url IS NULL OR users.avatar_url = '' THEN EXCLUDED.avatar_url
         ELSE users.avatar_url
       END,
       role = CASE
         WHEN users.role = 'admin' OR EXCLUDED.role = 'admin' THEN 'admin'
         ELSE users.role
       END
     RETURNING id, name, email, avatar_url, role, provider`,
    [name, email, role, googleAvatarUrl],
  );

  const user = upserted.rows[0];
  setAuthCookie(res, signToken(user));
  return res.redirect(`${resolvedFrontend}${nextPath}`);
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
  let avatarUrl = "";

  try {
    avatarUrl = normalizeAvatarUrl(req.body.avatarUrl);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }

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
  if (authUser.provider === "google" && password.trim()) {
    return res.status(400).json({ message: "Google uporabniki ne morejo spremeniti gesla tukaj." });
  }

  if (password.trim()) {
    if (password.trim().length < 6) {
      return res.status(400).json({ message: "Password must contain at least 6 characters." });
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
  return res.json({ user: toPublicUser(user) });
});

app.get("/api/quizzes", async (_req, res) => {
  const rows = await pool.query(
    "SELECT id, title, topic, difficulty, questions FROM quizzes ORDER BY created_at ASC",
  );

  const quizzes = rows.rows.map((q) => ({
    id: q.id,
    title: q.title,
    topic: q.topic,
    difficulty: q.difficulty,
    questions: q.questions,
  }));

  return res.json({ quizzes });
});

app.post("/api/quizzes", async (req, res) => {
  const authUser = await getAuthUser(req);
  if (!authUser) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
  if (authUser.role !== "admin") {
    return res.status(403).json({ message: "Admin access required." });
  }

  const title = (req.body.title || "").trim();
  const topic = (req.body.topic || "").trim();
  const difficulty = (req.body.difficulty || "easy").trim();
  const questions = Array.isArray(req.body.questions) ? req.body.questions : [];

  if (!title || !topic || questions.length === 0) {
    return res.status(400).json({ message: "Invalid quiz payload." });
  }

  const id = req.body.id || crypto.randomUUID();

  const created = await pool.query(
    `INSERT INTO quizzes (id, title, topic, difficulty, questions)
     VALUES ($1, $2, $3, $4, $5::jsonb)
     RETURNING id, title, topic, difficulty, questions`,
    [id, title, topic, difficulty, JSON.stringify(questions)],
  );

  return res.status(201).json({ quiz: created.rows[0] });
});

app.put("/api/quizzes/:id", async (req, res) => {
  const authUser = await getAuthUser(req);
  if (!authUser) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
  if (authUser.role !== "admin") {
    return res.status(403).json({ message: "Admin access required." });
  }

  const title = (req.body.title || "").trim();
  const topic = (req.body.topic || "").trim();
  const difficulty = (req.body.difficulty || "easy").trim();
  const questions = Array.isArray(req.body.questions) ? req.body.questions : [];

  if (!title || !topic || questions.length === 0) {
    return res.status(400).json({ message: "Invalid quiz payload." });
  }

  const updated = await pool.query(
    `UPDATE quizzes
     SET title = $1,
         topic = $2,
         difficulty = $3,
         questions = $4::jsonb
     WHERE id = $5
     RETURNING id, title, topic, difficulty, questions`,
    [title, topic, difficulty, JSON.stringify(questions), req.params.id],
  );

  if (!updated.rowCount) {
    return res.status(404).json({ message: "Quiz not found." });
  }

  return res.json({ quiz: updated.rows[0] });
});

app.delete("/api/quizzes/:id", async (req, res) => {
  const authUser = await getAuthUser(req);
  if (!authUser) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
  if (authUser.role !== "admin") {
    return res.status(403).json({ message: "Admin access required." });
  }

  const deleted = await pool.query("DELETE FROM quizzes WHERE id = $1 RETURNING id", [req.params.id]);
  if (!deleted.rowCount) {
    return res.status(404).json({ message: "Quiz not found." });
  }

  return res.json({ ok: true });
});

app.get("/api/results", async (req, res) => {
  const authUser = await getAuthUser(req);
  if (!authUser) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }

  const quizIds = parseQuizIds(String(req.query.quizIds || ""));
  if (quizIds.length) {
    const leaderboards = await getLeaderboardsByQuizIds(authUser.id, quizIds);
    return res.json({ leaderboards });
  }

  const rows = await pool.query(
    `SELECT id, user_id, quiz_id, quiz_title, score, total, percentage, duration_seconds, review, created_at
     FROM results
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [authUser.id],
  );

  const results = rows.rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    quizId: r.quiz_id,
    quizTitle: r.quiz_title,
    score: r.score,
    total: r.total,
    percentage: r.percentage,
    durationSeconds: Number(r.duration_seconds) || 0,
    review: Array.isArray(r.review) ? r.review : [],
    createdAt: r.created_at,
  }));

  return res.json({ results });
});

app.get("/api/results/leaderboards", async (req, res) => {
  const authUser = await getAuthUser(req);
  if (!authUser) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }

  const quizIds = parseQuizIds(String(req.query.quizIds || ""));
  const leaderboards = await getLeaderboardsByQuizIds(authUser.id, quizIds);
  return res.json({ leaderboards });
});

app.post("/api/results/submit", async (req, res) => {
  const authUser = await getAuthUser(req);
  if (!authUser) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }

  const quizId = req.body.quizId;
  const answers = Array.isArray(req.body.answers) ? req.body.answers.map((x) => Number(x)) : [];
  const rawDurationSeconds = Number(req.body.durationSeconds);
  const durationSeconds = Number.isFinite(rawDurationSeconds)
    ? Math.max(0, Math.round(rawDurationSeconds))
    : 0;

  if (!quizId || !answers.length) {
    return res.status(400).json({ message: "Invalid payload." });
  }

  const quizResult = await pool.query(
    "SELECT id, title, questions FROM quizzes WHERE id = $1 LIMIT 1",
    [quizId],
  );

  if (!quizResult.rowCount) {
    return res.status(404).json({ message: "Quiz does not exist." });
  }

  const quiz = quizResult.rows[0];
  const questions = Array.isArray(quiz.questions) ? quiz.questions : [];

  if (answers.length !== questions.length) {
    return res.status(400).json({ message: "Answer count mismatch." });
  }

  let score = 0;
  const review = questions.map((question, idx) => {
    const selectedIndex = Number(answers[idx]);
    const correctIndex = Number(question.answerIndex);
    const options = Array.isArray(question.options) ? question.options : [];
    const isCorrect = selectedIndex === correctIndex;

    if (isCorrect) {
      score += 1;
    }

    return {
      questionId: question.id || `q-${idx + 1}`,
      text: question.text || "",
      selectedIndex,
      selectedOption: options[selectedIndex] ?? "Odgovor ni bil izbran.",
      correctIndex,
      correctOption: options[correctIndex] ?? "Pravilen odgovor ni nastavljen.",
      isCorrect,
    };
  });

  const total = questions.length;
  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;

  const inserted = await pool.query(
    `INSERT INTO results (user_id, quiz_id, quiz_title, score, total, percentage, duration_seconds, review)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
     RETURNING id, user_id, quiz_id, quiz_title, score, total, percentage, duration_seconds, review, created_at`,
    [
      authUser.id,
      quiz.id,
      quiz.title,
      score,
      total,
      percentage,
      durationSeconds,
      JSON.stringify(review),
    ],
  );

  const row = inserted.rows[0];
  const entry = {
    id: row.id,
    userId: row.user_id,
    quizId: row.quiz_id,
    quizTitle: row.quiz_title,
    score: row.score,
    total: row.total,
    percentage: row.percentage,
    durationSeconds: Number(row.duration_seconds) || 0,
    review: Array.isArray(row.review) ? row.review : [],
    createdAt: row.created_at,
  };

  return res.json({ entry });
});

app.get("/api/users", async (req, res) => {
  const authUser = await getAuthUser(req);
  if (!authUser) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
  if (authUser.role !== "admin") {
    return res.status(403).json({ message: "Admin access required." });
  }

  const users = await pool.query(
    "SELECT id, name, email, avatar_url, role, provider FROM users ORDER BY name ASC",
  );
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
