import { initDb, pool } from "../_lib/db.js";
import { getAuthUser, json, parseBody } from "../_lib/http.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return json(res, 405, { message: "Method Not Allowed" });
  }

  await initDb();
  const authUser = await getAuthUser(req);
  if (!authUser) {
    return json(res, 401, { message: "Invalid or expired token." });
  }

  const body = parseBody(req);
  const quizId = body.quizId;
  const answers = Array.isArray(body.answers) ? body.answers.map((x) => Number(x)) : [];

  if (!quizId || !answers.length) {
    return json(res, 400, { message: "Invalid payload." });
  }

  const quizResult = await pool.query(
    "SELECT id, title, questions FROM quizzes WHERE id = $1 LIMIT 1",
    [quizId],
  );

  if (!quizResult.rowCount) {
    return json(res, 404, { message: "Quiz does not exist." });
  }

  const quiz = quizResult.rows[0];
  const questions = Array.isArray(quiz.questions) ? quiz.questions : [];

  if (answers.length !== questions.length) {
    return json(res, 400, { message: "Answer count mismatch." });
  }

  let score = 0;
  questions.forEach((question, idx) => {
    if (Number(answers[idx]) === Number(question.answerIndex)) {
      score += 1;
    }
  });

  const total = questions.length;
  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;

  const inserted = await pool.query(
    `INSERT INTO results (user_id, quiz_id, quiz_title, score, total, percentage)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, user_id, quiz_id, quiz_title, score, total, percentage, created_at`,
    [authUser.id, quiz.id, quiz.title, score, total, percentage],
  );

  const row = inserted.rows[0];
  const entry = {
    id: row.id,
    userId: row.user_id,
    quizId: row.quiz_id,
    quizTitle: row.quiz_title,
    score: row.score,
    total: row.total,
    percentage: row.percentage,
    createdAt: row.created_at,
  };

  return json(res, 200, { entry });
}
