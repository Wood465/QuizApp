import { initDb, pool } from "../_lib/db.js";
import { getAuthUser, json } from "../_lib/http.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return json(res, 405, { message: "Method Not Allowed" });
  }

  await initDb();
  const authUser = await getAuthUser(req);
  if (!authUser) {
    return json(res, 401, { message: "Invalid or expired token." });
  }

  const rows = await pool.query(
    `SELECT id, user_id, quiz_id, quiz_title, score, total, percentage, duration_seconds, review, created_at
     FROM results
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [authUser.id],
  );

  const results = rows.rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    quizId: r.quiz_id,
    quizTitle: r.quiz_title,
    score: r.score,
    total: r.total,
    percentage: r.percentage,
    durationSeconds: Number(r.duration_seconds) || 0,
    review: Array.isArray(r.review) ? r.review : [],
    createdAt: r.created_at,
  }));

  return json(res, 200, { results });
}
