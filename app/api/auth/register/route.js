import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { initDb, pool } from "@/src/lib/server/db";
import { signToken, toPublicUser } from "@/src/lib/server/auth";

export async function POST(request) {
  await initDb();

  const body = await request.json();
  const name = (body.name || "").trim();
  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";

  if (!name || !email || !password) {
    return NextResponse.json(
      { message: "Name, email and password are required." },
      { status: 400 },
    );
  }

  if (password.length < 6) {
    return NextResponse.json(
      { message: "Password must contain at least 6 characters." },
      { status: 400 },
    );
  }

  const existing = await pool.query("SELECT id FROM users WHERE email = $1 LIMIT 1", [email]);
  if (existing.rowCount) {
    return NextResponse.json(
      { message: "User with this email already exists." },
      { status: 409 },
    );
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

  return NextResponse.json({ token, user: toPublicUser(user) }, { status: 201 });
}
