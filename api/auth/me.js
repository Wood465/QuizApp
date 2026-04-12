import { initDb } from "../_lib/db.js";
import { getAuthUser, json, toPublicUser } from "../_lib/http.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return json(res, 405, { message: "Method Not Allowed" });
  }

  await initDb();
  const user = await getAuthUser(req);
  if (!user) {
    return json(res, 401, { message: "Invalid or expired token." });
  }

  return json(res, 200, { user: toPublicUser(user) });
}
