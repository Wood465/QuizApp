import { initDb, pool } from "../_lib/db.js";
import { getAuthUser, json } from "../_lib/http.js";

export default async function handler(req, res) {
  if (req.method !== "DELETE") {
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

  const userId = req.query.id;
  const deleted = await pool.query("DELETE FROM users WHERE id = $1 RETURNING id", [userId]);

  if (!deleted.rowCount) {
    return json(res, 404, { message: "User not found." });
  }

  return json(res, 200, { ok: true });
}
