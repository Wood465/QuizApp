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

  return json(res, 405, { message: "Method Not Allowed" });
}
