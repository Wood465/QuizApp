import { initDb, pool } from "../_lib/db.js";
import { getAuthUser, json } from "../_lib/http.js";

const DURATION_FALLBACK = 2147483647;

function parseQuizIds(input) {
  if (typeof input !== "string") {
    return [];
  }

  return input
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return json(res, 405, { message: "Method Not Allowed" });
  }

  await initDb();
  const authUser = await getAuthUser(req);
  if (!authUser) {
    return json(res, 401, { message: "Invalid or expired token." });
  }

  const quizIds = parseQuizIds(String(req.query.quizIds || ""));
  if (quizIds.length) {
    const rows = await pool.query(
      `
        WITH user_best AS (
          SELECT
            r.id,
            r.user_id,
            r.quiz_id,
            r.quiz_title,
            r.score,
            r.total,
            r.percentage,
            r.duration_seconds,
            r.created_at,
            ROW_NUMBER() OVER (
              PARTITION BY r.quiz_id, r.user_id
              ORDER BY
                r.percentage DESC,
                r.score DESC,
                CASE
                  WHEN r.duration_seconds > 0 THEN r.duration_seconds
                  ELSE $2
                END ASC,
                r.created_at ASC,
                r.id ASC
            ) AS user_attempt_rank
          FROM results r
          WHERE r.quiz_id = ANY($1::text[])
        ),
        best_results AS (
          SELECT *
          FROM user_best
          WHERE user_attempt_rank = 1
        ),
        ranked AS (
          SELECT
            b.id,
            b.user_id,
            b.quiz_id,
            b.quiz_title,
            b.score,
            b.total,
            b.percentage,
            b.duration_seconds,
            b.created_at,
            u.name AS user_name,
            ROW_NUMBER() OVER (
              PARTITION BY b.quiz_id
              ORDER BY
                b.percentage DESC,
                b.score DESC,
                CASE
                  WHEN b.duration_seconds > 0 THEN b.duration_seconds
                  ELSE $2
                END ASC,
                b.created_at ASC,
                b.id ASC
            ) AS rank_position,
            COUNT(*) OVER (PARTITION BY b.quiz_id) AS total_participants
          FROM best_results b
          JOIN users u ON u.id = b.user_id
        )
        SELECT
          quiz_id,
          quiz_title,
          user_id,
          user_name,
          score,
          total,
          percentage,
          duration_seconds,
          created_at,
          rank_position,
          total_participants
        FROM ranked
        ORDER BY quiz_id ASC, rank_position ASC
      `,
      [quizIds, DURATION_FALLBACK],
    );

    const byQuiz = new Map();

    for (const row of rows.rows) {
      if (!byQuiz.has(row.quiz_id)) {
        byQuiz.set(row.quiz_id, {
          quizId: row.quiz_id,
          quizTitle: row.quiz_title,
          totalParticipants: Number(row.total_participants) || 0,
          userRank: null,
          top10: [],
        });
      }

      const group = byQuiz.get(row.quiz_id);

      if (row.user_id === authUser.id) {
        group.userRank = Number(row.rank_position) || null;
      }

      if (Number(row.rank_position) <= 10) {
        group.top10.push({
          rank: Number(row.rank_position),
          name: row.user_name,
          percentage: Number(row.percentage),
          score: Number(row.score),
          total: Number(row.total),
          durationSeconds: Number(row.duration_seconds) || 0,
        });
      }
    }

    const leaderboards = quizIds.map((quizId) => {
      const group = byQuiz.get(quizId);
      if (group) {
        return group;
      }

      return {
        quizId,
        quizTitle: "",
        totalParticipants: 0,
        userRank: null,
        top10: [],
      };
    });

    return json(res, 200, { leaderboards });
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
