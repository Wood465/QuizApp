import { initDb, pool } from "../_lib/db.js";
import { getAuthUser, json, toPublicUser } from "../_lib/http.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return json(res, 405, { message: "Method Not Allowed" });
  }

  await initDb();
  const authUser = await getAuthUser(req);
  if (!authUser) {
    return json(res, 401, { message: "Invalid or expired token." });
  }

  if (authUser.role !== "admin") {
    return json(res, 403, { message: "Admin access required." });
  }

  const users = await pool.query(
    "SELECT id, name, email, role, provider FROM users ORDER BY name ASC",
  );

  return json(res, 200, { users: users.rows.map(toPublicUser) });
}
