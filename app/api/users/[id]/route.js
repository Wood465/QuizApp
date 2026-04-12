import { NextResponse } from "next/server";
import { initDb, pool } from "@/src/lib/server/db";
import { getAuthUserFromRequest } from "@/src/lib/server/auth";

export async function DELETE(request, { params }) {
  await initDb();

  const authUser = await getAuthUserFromRequest(request);
  if (!authUser) {
    return NextResponse.json({ message: "Invalid or expired token." }, { status: 401 });
  }

  if (authUser.role !== "admin") {
    return NextResponse.json({ message: "Admin access required." }, { status: 403 });
  }

  const userId = params.id;
  const deleted = await pool.query("DELETE FROM users WHERE id = $1 RETURNING id", [userId]);

  if (!deleted.rowCount) {
    return NextResponse.json({ message: "User not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
