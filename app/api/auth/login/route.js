import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { initDb, pool } from "@/src/lib/server/db";
import { signToken, toPublicUser } from "@/src/lib/server/auth";

export async function POST(request) {
  await initDb();

  const body = await request.json();
  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";

  if (!email || !password) {
    return NextResponse.json(
      { message: "Email and password are required." },
      { status: 400 },
    );
  }

  const result = await pool.query(
    "SELECT id, name, email, role, provider, password_hash FROM users WHERE email = $1 LIMIT 1",
    [email],
  );

  if (!result.rowCount) {
    return NextResponse.json({ message: "Invalid email or password." }, { status: 401 });
  }

  const user = result.rows[0];
  if (!user.password_hash) {
    return NextResponse.json({ message: "Use Google login for this account." }, { status: 400 });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return NextResponse.json({ message: "Invalid email or password." }, { status: 401 });
  }

  const token = signToken(user);
  return NextResponse.json({ token, user: toPublicUser(user) });
}
