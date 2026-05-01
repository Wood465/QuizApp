import { initDb, pool } from "../_lib/db.js";
import { getAuthUser, json, parseBody } from "../_lib/http.js";

function normalizeQuestionType(question) {
  if (question?.type === "multiple") {
    return "multiple";
  }
  if (question?.type === "text") {
    return "text";
  }
  return "single";
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function normalizeIndexList(value, maxIndex) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value
    .map((entry) => Number(entry))
    .filter((entry) => Number.isInteger(entry) && entry >= 0 && entry <= maxIndex))]
    .sort((a, b) => a - b);
}

function areNumberArraysEqual(left, right) {
  if (left.length !== right.length) {
    return false;
  }
  return left.every((entry, index) => entry === right[index]);
}

function resolveCorrectText(question) {
  if (typeof question?.answerText === "string") {
    return question.answerText.trim();
  }
  if (typeof question?.answer === "string") {
    return question.answer.trim();
  }
  if (typeof question?.correctAnswer === "string") {
    return question.correctAnswer.trim();
  }
  return "";
}

function resolveCorrectIndices(question, maxIndex) {
  const fromAnswerIndices = normalizeIndexList(question?.answerIndices, maxIndex);
  if (fromAnswerIndices.length) {
    return fromAnswerIndices;
  }

  const fromCorrectIndices = normalizeIndexList(question?.correctIndices, maxIndex);
  if (fromCorrectIndices.length) {
    return fromCorrectIndices;
  }

  const singleFallback = Number(question?.answerIndex);
  if (Number.isInteger(singleFallback) && singleFallback >= 0 && singleFallback <= maxIndex) {
    return [singleFallback];
  }

  return [];
}

function evaluateAnswer(question, rawAnswer, idx) {
  const questionType = normalizeQuestionType(question);
  const options = Array.isArray(question.options) ? question.options : [];

  if (questionType === "text") {
    const selectedText = typeof rawAnswer === "string" ? rawAnswer.trim() : "";
    const correctText = resolveCorrectText(question);
    const isCorrect =
      Boolean(selectedText) &&
      Boolean(correctText) &&
      normalizeText(selectedText) === normalizeText(correctText);

    return {
      questionId: question.id || `q-${idx + 1}`,
      questionType,
      text: question.text || "",
      selectedOption: selectedText || "Odgovor ni bil vnesen.",
      correctOption: correctText || "Pravilen odgovor ni nastavljen.",
      isCorrect,
    };
  }

  if (questionType === "multiple") {
    const selectedIndices = normalizeIndexList(rawAnswer, options.length - 1);
    const correctIndices = resolveCorrectIndices(question, options.length - 1);
    const isCorrect =
      selectedIndices.length > 0 &&
      correctIndices.length > 0 &&
      areNumberArraysEqual(selectedIndices, correctIndices);

    const selectedOption = selectedIndices.length
      ? selectedIndices.map((entry) => options[entry]).filter(Boolean).join(", ")
      : "Odgovor ni bil izbran.";
    const correctOption = correctIndices.length
      ? correctIndices.map((entry) => options[entry]).filter(Boolean).join(", ")
      : "Pravilen odgovor ni nastavljen.";

    return {
      questionId: question.id || `q-${idx + 1}`,
      questionType,
      text: question.text || "",
      selectedIndices,
      correctIndices,
      selectedOption,
      correctOption,
      isCorrect,
    };
  }

  const selectedIndex = Number(rawAnswer);
  const directCorrectIndex = Number(question.answerIndex);
  const correctIndex = Number.isInteger(directCorrectIndex)
    ? directCorrectIndex
    : resolveCorrectIndices(question, options.length - 1)[0];
  const isCorrect = Number.isInteger(selectedIndex) && Number.isInteger(correctIndex) && selectedIndex === correctIndex;

  return {
    questionId: question.id || `q-${idx + 1}`,
    questionType: "single",
    text: question.text || "",
    selectedIndex,
    selectedOption: options[selectedIndex] ?? "Odgovor ni bil izbran.",
    correctIndex,
    correctOption: options[correctIndex] ?? "Pravilen odgovor ni nastavljen.",
    isCorrect,
  };
}

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
  const answers = Array.isArray(body.answers) ? body.answers : [];
  const rawDurationSeconds = Number(body.durationSeconds);
  const durationSeconds = Number.isFinite(rawDurationSeconds)
    ? Math.max(0, Math.round(rawDurationSeconds))
    : 0;

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
  const review = questions.map((question, idx) => {
    const entry = evaluateAnswer(question, answers[idx], idx);
    if (entry.isCorrect) {
      score += 1;
    }
    return entry;
  });

  const total = questions.length;
  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;

  const inserted = await pool.query(
    `INSERT INTO results (user_id, quiz_id, quiz_title, score, total, percentage, duration_seconds, review)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
     RETURNING id, user_id, quiz_id, quiz_title, score, total, percentage, duration_seconds, review, created_at`,
    [
      authUser.id,
      quiz.id,
      quiz.title,
      score,
      total,
      percentage,
      durationSeconds,
      JSON.stringify(review),
    ],
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
    durationSeconds: Number(row.duration_seconds) || 0,
    review: Array.isArray(row.review) ? row.review : [],
    createdAt: row.created_at,
  };

  return json(res, 200, { entry });
}
