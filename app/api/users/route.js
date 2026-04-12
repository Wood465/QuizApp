import { NextResponse } from "next/server";
import { initDb, pool } from "@/src/lib/server/db";
import { getAuthUserFromRequest, toPublicUser } from "@/src/lib/server/auth";

export async function GET(request) {
  await initDb();

  const authUser = await getAuthUserFromRequest(request);
  if (!authUser) {
    return NextResponse.json({ message: "Invalid or expired token." }, { status: 401 });
  }

  if (authUser.role !== "admin") {
    return NextResponse.json({ message: "Admin access required." }, { status: 403 });
  }

  const users = await pool.query(
    "SELECT id, name, email, role, provider FROM users ORDER BY name ASC",
  );

  return NextResponse.json({ users: users.rows.map(toPublicUser) });
}
