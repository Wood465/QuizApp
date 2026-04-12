import { OAuth2Client } from "google-auth-library";
import { initDb } from "../../_lib/db.js";
import { normalizeFrontendOrigin, normalizeNext } from "../../_lib/http.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  await initDb();

  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || "";

  if (!clientId || !clientSecret || !redirectUri) {
    return res.status(500).json({ message: "Missing Google OAuth configuration." });
  }

  const frontendFallback =
    process.env.FRONTEND_URL || process.env.CORS_ORIGIN || "https://quiz-app-ten-rouge-47.vercel.app";

  const nextPath = normalizeNext(req.query.next, "/dashboard");
  const frontendOrigin = normalizeFrontendOrigin(req.query.frontend, frontendFallback);
  const state = Buffer.from(JSON.stringify({ nextPath, frontendOrigin }), "utf8").toString("base64url");

  const oauth = new OAuth2Client(clientId, clientSecret, redirectUri);
  const url = oauth.generateAuthUrl({
    access_type: "offline",
    scope: ["openid", "email", "profile"],
    include_granted_scopes: true,
    prompt: "consent",
    state,
  });

  return res.redirect(url);
}
