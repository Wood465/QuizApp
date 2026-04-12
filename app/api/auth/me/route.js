import { NextResponse } from "next/server";
import { initDb } from "@/src/lib/server/db";
import { getAuthUserFromRequest, toPublicUser } from "@/src/lib/server/auth";

export async function GET(request) {
  await initDb();

  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ message: "Invalid or expired token." }, { status: 401 });
  }

  return NextResponse.json({ user: toPublicUser(user) });
}
