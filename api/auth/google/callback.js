import { OAuth2Client } from "google-auth-library";
import { initDb, pool } from "../../_lib/db.js";
import { signToken } from "../../_lib/jwt.js";
import { normalizeFrontendOrigin, normalizeNext, setAuthCookie } from "../../_lib/http.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  await initDb();

  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || "";

  const frontendFallback =
    process.env.FRONTEND_URL || process.env.CORS_ORIGIN || "https://quiz-app-ten-rouge-47.vercel.app";

  if (!clientId || !clientSecret || !redirectUri) {
    return res.redirect(`${frontendFallback}/login?error=google_config`);
  }

  const code = req.query.code || "";
  const rawState = req.query.state || "";

  let nextPath = "/dashboard";
  let resolvedFrontend = frontendFallback;
  try {
    const parsed = JSON.parse(Buffer.from(rawState, "base64url").toString("utf8"));
    nextPath = normalizeNext(parsed?.nextPath, "/dashboard");
    resolvedFrontend = normalizeFrontendOrigin(parsed?.frontendOrigin, frontendFallback);
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
}
