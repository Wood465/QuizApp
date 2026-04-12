import { NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";

function getGoogleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || "";

  if (!clientId || !clientSecret || !redirectUri) {
    return null;
  }

  return { clientId, clientSecret, redirectUri };
}

function normalizeNext(nextPath) {
  if (!nextPath || typeof nextPath !== "string") {
    return "/dashboard";
  }
  if (!nextPath.startsWith("/")) {
    return "/dashboard";
  }
  if (nextPath.startsWith("//")) {
    return "/dashboard";
  }
  return nextPath;
}

export async function GET(request) {
  const cfg = getGoogleConfig();
  if (!cfg) {
    return NextResponse.json(
      { message: "Missing GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET/GOOGLE_REDIRECT_URI." },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(request.url);
  const nextPath = normalizeNext(searchParams.get("next"));
  const state = Buffer.from(JSON.stringify({ nextPath }), "utf8").toString("base64url");

  const oauth = new OAuth2Client(cfg.clientId, cfg.clientSecret, cfg.redirectUri);
  const url = oauth.generateAuthUrl({
    access_type: "offline",
    scope: ["openid", "email", "profile"],
    include_granted_scopes: true,
    prompt: "consent",
    state,
  });

  return NextResponse.redirect(url);
}
