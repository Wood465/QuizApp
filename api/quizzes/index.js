import { initDb, pool } from "../_lib/db.js";
import { getAuthUser, json, parseBody } from "../_lib/http.js";

export default async function handler(req, res) {
  await initDb();

  if (req.method === "GET") {
    const rows = await pool.query(
      "SELECT id, title, topic, difficulty, questions FROM quizzes ORDER BY created_at ASC",
    );

    const quizzes = rows.rows.map((q) => ({
      id: q.id,
      title: q.title,
      topic: q.topic,
      difficulty: q.difficulty,
      questions: q.questions,
    }));

    return json(res, 200, { quizzes });
  }

  if (req.method === "POST") {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return json(res, 401, { message: "Invalid or expired token." });
    }
    if (authUser.role !== "admin") {
      return json(res, 403, { message: "Admin access required." });
    }

    const body = parseBody(req);
    const title = (body.title || "").trim();
    const topic = (body.topic || "").trim();
    const difficulty = (body.difficulty || "easy").trim();
    const questions = Array.isArray(body.questions) ? body.questions : [];

    if (!title || !topic || questions.length === 0) {
      return json(res, 400, { message: "Invalid quiz payload." });
    }

    const id = body.id || crypto.randomUUID();

    const created = await pool.query(
      `INSERT INTO quizzes (id, title, topic, difficulty, questions)
       VALUES ($1, $2, $3, $4, $5::jsonb)
       RETURNING id, title, topic, difficulty, questions`,
      [id, title, topic, difficulty, JSON.stringify(questions)],
    );

    return json(res, 201, { quiz: created.rows[0] });
  }

  if (req.method === "PUT") {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return json(res, 401, { message: "Invalid or expired token." });
    }
    if (authUser.role !== "admin") {
      return json(res, 403, { message: "Admin access required." });
    }

    const quizId = String(req.query.id || "").trim();
    if (!quizId) {
      return json(res, 400, { message: "Missing quiz id." });
    }

    const body = parseBody(req);
    const title = (body.title || "").trim();
    const topic = (body.topic || "").trim();
    const difficulty = (body.difficulty || "easy").trim();
    const questions = Array.isArray(body.questions) ? body.questions : [];

    if (!title || !topic || questions.length === 0) {
      return json(res, 400, { message: "Invalid quiz payload." });
    }

    const updated = await pool.query(
      `UPDATE quizzes
       SET title = $1,
           topic = $2,
           difficulty = $3,
           questions = $4::jsonb
       WHERE id = $5
       RETURNING id, title, topic, difficulty, questions`,
      [title, topic, difficulty, JSON.stringify(questions), quizId],
    );

    if (!updated.rowCount) {
      return json(res, 404, { message: "Quiz not found." });
    }

    return json(res, 200, { quiz: updated.rows[0] });
  }

  if (req.method === "DELETE") {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return json(res, 401, { message: "Invalid or expired token." });
    }
    if (authUser.role !== "admin") {
      return json(res, 403, { message: "Admin access required." });
    }

    const quizId = String(req.query.id || "").trim();
    if (!quizId) {
      return json(res, 400, { message: "Missing quiz id." });
    }

    const deleted = await pool.query("DELETE FROM quizzes WHERE id = $1 RETURNING id", [quizId]);
    if (!deleted.rowCount) {
      return json(res, 404, { message: "Quiz not found." });
    }

    return json(res, 200, { ok: true });
  }

  return json(res, 405, { message: "Method Not Allowed" });
}
