import { NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import { initDb, pool } from "@/src/lib/server/db";
import { signToken, toPublicUser } from "@/src/lib/server/auth";

function getGoogleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || "";

  if (!clientId || !clientSecret || !redirectUri) {
    return null;
  }

  return { clientId, clientSecret, redirectUri };
}

function parseState(rawState) {
  try {
    const parsed = JSON.parse(Buffer.from(rawState || "", "base64url").toString("utf8"));
    const nextPath = parsed?.nextPath;
    if (typeof nextPath === "string" && nextPath.startsWith("/") && !nextPath.startsWith("//")) {
      return nextPath;
    }
  } catch {
    // ignore
  }
  return "/dashboard";
}

export async function GET(request) {
  await initDb();

  const cfg = getGoogleConfig();
  if (!cfg) {
    return NextResponse.redirect(new URL("/login?error=google_config", request.url));
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code") || "";
  const state = url.searchParams.get("state") || "";
  const nextPath = parseState(state);

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=google_code", request.url));
  }

  const oauth = new OAuth2Client(cfg.clientId, cfg.clientSecret, cfg.redirectUri);

  let payload;
  try {
    const { tokens } = await oauth.getToken({
      code,
      redirect_uri: cfg.redirectUri,
    });

    const idToken = tokens.id_token;
    if (!idToken) {
      return NextResponse.redirect(new URL("/login?error=google_id_token", request.url));
    }

    const ticket = await oauth.verifyIdToken({
      idToken,
      audience: cfg.clientId,
    });

    payload = ticket.getPayload();
  } catch {
    return NextResponse.redirect(new URL("/login?error=google_verify", request.url));
  }

  const email = (payload?.email || "").toLowerCase();
  const name = payload?.name || email.split("@")[0] || "Uporabnik";

  if (!email) {
    return NextResponse.redirect(new URL("/login?error=google_email", request.url));
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
  const redirectUrl = new URL(`/login?token=${encodeURIComponent(token)}&next=${encodeURIComponent(nextPath)}`, request.url);

  return NextResponse.redirect(redirectUrl);
}
