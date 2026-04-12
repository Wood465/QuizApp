import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { initDb, pool } from "@/src/lib/server/db";
import { getAuthUserFromRequest, signToken, toPublicUser } from "@/src/lib/server/auth";

export async function PUT(request) {
  await initDb();

  const authUser = await getAuthUserFromRequest(request);
  if (!authUser) {
    return NextResponse.json({ message: "Invalid or expired token." }, { status: 401 });
  }

  const body = await request.json();
  const name = (body.name || "").trim();
  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";

  if (!name || !email) {
    return NextResponse.json({ message: "Name and email are required." }, { status: 400 });
  }

  const conflict = await pool.query(
    "SELECT id FROM users WHERE email = $1 AND id <> $2 LIMIT 1",
    [email, authUser.id],
  );

  if (conflict.rowCount) {
    return NextResponse.json({ message: "Email is already in use." }, { status: 409 });
  }

  let passwordHash = null;
  if (password.trim()) {
    if (password.trim().length < 6) {
      return NextResponse.json(
        { message: "Password must contain at least 6 characters." },
        { status: 400 },
      );
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
  const token = signToken(user);
  return NextResponse.json({ token, user: toPublicUser(user) });
}
