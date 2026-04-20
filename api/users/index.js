import { initDb, pool } from "../_lib/db.js";
import { getAuthUser, json, toPublicUser } from "../_lib/http.js";

export default async function handler(req, res) {
  await initDb();
  const authUser = await getAuthUser(req);
  if (!authUser) {
    return json(res, 401, { message: "Invalid or expired token." });
  }

  if (authUser.role !== "admin") {
    return json(res, 403, { message: "Admin access required." });
  }

  if (req.method === "GET") {
    const users = await pool.query(
      "SELECT id, name, email, avatar_url, role, provider FROM users ORDER BY name ASC",
    );

    return json(res, 200, { users: users.rows.map(toPublicUser) });
  }

  if (req.method === "DELETE") {
    const userId = String(req.query.id || "").trim();
    if (!userId) {
      return json(res, 400, { message: "Missing user id." });
    }

    const deleted = await pool.query("DELETE FROM users WHERE id = $1 RETURNING id", [userId]);

    if (!deleted.rowCount) {
      return json(res, 404, { message: "User not found." });
    }

    return json(res, 200, { ok: true });
  }

  return json(res, 405, { message: "Method Not Allowed" });
}
