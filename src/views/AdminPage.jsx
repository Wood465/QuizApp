import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useQuiz } from "../context/QuizContext";

const initialQuestion = {
  text: "",
  type: "single",
  options: "",
  answerIndex: 0,
  answerIndices: "",
  answerText: "",
};

function parseIndexList(value, maxIndex) {
  if (typeof value !== "string") {
    return [];
  }

  return [...new Set(value
    .split(",")
    .map((entry) => Number(entry.trim()))
    .filter((entry) => Number.isInteger(entry) && entry >= 0 && entry <= maxIndex))]
    .sort((a, b) => a - b);
}

function parseQuestions(rawQuestions) {
  let invalidCount = 0;

  const questions = rawQuestions
    .map((item, idx) => {
      const text = item.text.trim();
      if (!text) {
        invalidCount += 1;
        return null;
      }

      const type = item.type === "multiple" || item.type === "text" ? item.type : "single";

      if (type === "text") {
        const answerText = item.answerText.trim();
        if (!answerText) {
          invalidCount += 1;
          return null;
        }

        return {
          id: `q-${idx + 1}`,
          text,
          type: "text",
          answerText,
        };
      }

      const options = item.options
        .split("|")
        .map((entry) => entry.trim())
        .filter(Boolean);

      if (options.length < 2) {
        invalidCount += 1;
        return null;
      }

      if (type === "multiple") {
        const answerIndices = parseIndexList(item.answerIndices, options.length - 1);
        if (answerIndices.length === 0) {
          invalidCount += 1;
          return null;
        }

        return {
          id: `q-${idx + 1}`,
          text,
          type: "multiple",
          options,
          answerIndices,
        };
      }

      const rawIndex = Number(item.answerIndex);
      const answerIndex = Number.isInteger(rawIndex) ? rawIndex : 0;

      return {
        id: `q-${idx + 1}`,
        text,
        type: "single",
        options,
        answerIndex: Math.min(Math.max(answerIndex, 0), options.length - 1),
      };
    })
    .filter(Boolean);

  return { questions, invalidCount };
}

function mapQuestionForForm(item) {
  const type = item?.type === "multiple" || item?.type === "text" ? item.type : "single";
  const options = Array.isArray(item?.options) ? item.options.join(" | ") : "";
  const answerIndex = Number.isInteger(Number(item?.answerIndex)) ? Number(item.answerIndex) : 0;
  const answerIndices = Array.isArray(item?.answerIndices)
    ? item.answerIndices.join(", ")
    : Array.isArray(item?.correctIndices)
      ? item.correctIndices.join(", ")
      : Number.isInteger(Number(item?.answerIndex))
        ? String(Number(item.answerIndex))
        : "";
  const answerText = typeof item?.answerText === "string"
    ? item.answerText
    : typeof item?.answer === "string"
      ? item.answer
      : typeof item?.correctAnswer === "string"
        ? item.correctAnswer
        : "";

  return {
    text: item?.text || "",
    type,
    options,
    answerIndex,
    answerIndices,
    answerText,
  };
}

function AdminPage() {
  const { quizzes, addQuiz, updateQuiz, deleteQuiz, loading } = useQuiz();
  const { users, currentUser, deleteUser } = useAuth();

  const [editingId, setEditingId] = useState(null);
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("easy");
  const [questions, setQuestions] = useState([initialQuestion]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [userNotice, setUserNotice] = useState("");
  const [isSavingQuiz, setIsSavingQuiz] = useState(false);
  const [deletingQuizId, setDeletingQuizId] = useState(null);
  const [deletingUserId, setDeletingUserId] = useState(null);

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setTopic("");
    setDifficulty("easy");
    setQuestions([initialQuestion]);
    setError("");
  };

  const startEdit = (quiz) => {
    setEditingId(quiz.id);
    setTitle(quiz.title);
    setTopic(quiz.topic);
    setDifficulty(quiz.difficulty);
    setQuestions(quiz.questions.map(mapQuestionForForm));
    setError("");
    setNotice("");
  };

  const addQuestionRow = () => {
    setQuestions((prev) => [...prev, { ...initialQuestion }]);
  };

  const removeQuestionRow = (index) => {
    setQuestions((prev) => {
      if (prev.length <= 1) {
        return prev;
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const saveQuiz = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");

    const parsed = parseQuestions(questions);
    const parsedQuestions = parsed.questions;
    if (!title.trim() || !topic.trim()) {
      setError("Naslov in tema sta obvezna.");
      return;
    }
    if (parsed.invalidCount > 0) {
      setError(
        "Nekatera vprasanja niso veljavna. Pri text dodaj pravilen odgovor, pri multiple pa indekse pravilnih odgovorov.",
      );
      return;
    }
    if (parsedQuestions.length === 0) {
      setError("Dodaj vsaj eno veljavno vprasanje.");
      return;
    }

    const payload = {
      title,
      topic,
      difficulty,
      questions: parsedQuestions,
    };

    setIsSavingQuiz(true);
    try {
      if (editingId) {
        await updateQuiz(editingId, payload);
        setNotice("Kviz je bil uspesno posodobljen.");
      } else {
        await addQuiz(payload);
        setNotice("Kviz je bil uspesno dodan.");
      }
      resetForm();
    } catch (apiError) {
      setError(apiError.message || "Shranjevanje kviza ni uspelo.");
    } finally {
      setIsSavingQuiz(false);
    }
  };

  const handleDeleteUser = async (user) => {
    const confirmed = window.confirm(`Ali zelis izbrisati uporabnika ${user.name}?`);
    if (!confirmed) {
      return;
    }

    setDeletingUserId(user.id);
    const result = await deleteUser(user.id);
    setDeletingUserId(null);

    if (!result.ok) {
      setUserNotice(result.message);
      return;
    }

    if (currentUser?.id === user.id) {
      setUserNotice("Izbrisal si svoj racun. Za nadaljevanje se ponovno prijavi.");
      return;
    }

    setUserNotice(`Uporabnik ${user.name} je bil izbrisan.`);
  };

  return (
    <section className="page-stack">
      <article className="card">
        <h1>Admin upravljanje kvizov</h1>
        <p className="muted">Dodajanje, urejanje in brisanje kvizov.</p>
        {loading ? <p className="muted">Nalagam kvize iz baze...</p> : null}

        <form className="form-stack" onSubmit={saveQuiz}>
          <label>
            Naslov kviza
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={isSavingQuiz}
            />
          </label>

          <label>
            Tema
            <input
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              disabled={isSavingQuiz}
            />
          </label>

          <label>
            Tezavnost
            <select
              value={difficulty}
              onChange={(event) => setDifficulty(event.target.value)}
              disabled={isSavingQuiz}
            >
              <option value="easy">easy</option>
              <option value="medium">medium</option>
              <option value="hard">hard</option>
            </select>
          </label>

          <h3>Vprasanja</h3>
          {questions.map((question, index) => (
            <div key={index} className="question-admin">
              <label>
                Besedilo vprasanja
                <input
                  value={question.text}
                  onChange={(event) =>
                    setQuestions((prev) =>
                      prev.map((entry, i) =>
                        i === index ? { ...entry, text: event.target.value } : entry,
                      ),
                    )
                  }
                  disabled={isSavingQuiz}
                />
              </label>

              <label>
                Tip vprasanja
                <select
                  value={question.type}
                  onChange={(event) =>
                    setQuestions((prev) =>
                      prev.map((entry, i) =>
                        i === index ? { ...entry, type: event.target.value } : entry,
                      ),
                    )
                  }
                  disabled={isSavingQuiz}
                >
                  <option value="single">Ena pravilna moznost</option>
                  <option value="multiple">Vec pravilnih moznosti</option>
                  <option value="text">Vpis odgovora</option>
                </select>
              </label>

              {question.type === "text" ? (
                <label>
                  Pravilen besedilni odgovor
                  <input
                    value={question.answerText}
                    onChange={(event) =>
                      setQuestions((prev) =>
                        prev.map((entry, i) =>
                          i === index ? { ...entry, answerText: event.target.value } : entry,
                        ),
                      )
                    }
                    disabled={isSavingQuiz}
                  />
                </label>
              ) : (
                <>
                  <label>
                    Moznosti (locene z |)
                    <input
                      value={question.options}
                      onChange={(event) =>
                        setQuestions((prev) =>
                          prev.map((entry, i) =>
                            i === index ? { ...entry, options: event.target.value } : entry,
                          ),
                        )
                      }
                      disabled={isSavingQuiz}
                    />
                  </label>

                  {question.type === "multiple" ? (
                    <label>
                      Indeksi pravilnih odgovorov (npr. 0,2)
                      <input
                        value={question.answerIndices}
                        onChange={(event) =>
                          setQuestions((prev) =>
                            prev.map((entry, i) =>
                              i === index
                                ? { ...entry, answerIndices: event.target.value }
                                : entry,
                            ),
                          )
                        }
                        disabled={isSavingQuiz}
                      />
                    </label>
                  ) : (
                    <label>
                      Indeks pravilnega odgovora (0,1,2...)
                      <input
                        type="number"
                        min="0"
                        value={question.answerIndex}
                        onChange={(event) =>
                          setQuestions((prev) =>
                            prev.map((entry, i) =>
                              i === index
                                ? { ...entry, answerIndex: Number(event.target.value) }
                                : entry,
                            ),
                          )
                        }
                        disabled={isSavingQuiz}
                      />
                    </label>
                  )}
                </>
              )}

              <div className="hero-actions">
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => removeQuestionRow(index)}
                  disabled={isSavingQuiz || questions.length <= 1}
                >
                  Odstrani vprasanje
                </button>
              </div>
            </div>
          ))}

          <div className="hero-actions">
            <button
              type="button"
              className="btn secondary"
              onClick={addQuestionRow}
              disabled={isSavingQuiz}
            >
              Dodaj vprasanje
            </button>
            <button
              type="button"
              className="btn secondary"
              onClick={() => removeQuestionRow(questions.length - 1)}
              disabled={isSavingQuiz || questions.length <= 1}
            >
              Odstrani zadnje
            </button>
          </div>

          {error ? <p className="error-text">{error}</p> : null}
          {notice ? <p className="notice-text">{notice}</p> : null}

          <div className="hero-actions">
            <button className="btn primary" type="submit" disabled={isSavingQuiz}>
              {isSavingQuiz
                ? "Shranjujem..."
                : editingId
                  ? "Shrani spremembe"
                  : "Dodaj kviz"}
            </button>
            {editingId ? (
              <button
                type="button"
                className="btn secondary"
                onClick={resetForm}
                disabled={isSavingQuiz}
              >
                Preklici urejanje
              </button>
            ) : null}
          </div>
        </form>
      </article>

      <article className="card">
        <h2>Obstojeci kvizi</h2>
        {quizzes.length === 0 ? (
          <p className="muted">Trenutno ni nobenega kviza v bazi.</p>
        ) : (
          <div className="quiz-list">
            {quizzes.map((quiz) => (
              <div className="quiz-item" key={quiz.id}>
                <div>
                  <h3>{quiz.title}</h3>
                  <p className="muted">
                    {quiz.topic} | {quiz.difficulty} | {quiz.questions.length} vprasanj
                  </p>
                </div>
                <div className="hero-actions">
                  <button type="button" className="btn secondary" onClick={() => startEdit(quiz)}>
                    Uredi
                  </button>
                  <button
                    type="button"
                    className="btn secondary"
                    disabled={deletingQuizId === quiz.id}
                    onClick={async () => {
                      const confirmed = window.confirm(
                        `Ali zelis izbrisati kviz "${quiz.title}"?`,
                      );
                      if (!confirmed) {
                        return;
                      }
                      setDeletingQuizId(quiz.id);
                      setError("");
                      setNotice("");
                      try {
                        await deleteQuiz(quiz.id);
                        setNotice("Kviz je bil uspesno izbrisan.");
                        if (editingId === quiz.id) {
                          resetForm();
                        }
                      } catch (apiError) {
                        setError(apiError.message || "Brisanje kviza ni uspelo.");
                      } finally {
                        setDeletingQuizId(null);
                      }
                    }}
                  >
                    {deletingQuizId === quiz.id ? "Brisem..." : "Brisi"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </article>

      <article className="card">
        <h2>Uporabniki (Neon PostgreSQL)</h2>
        <p className="muted">Upravljanje uporabnikov prek backend API.</p>
        {userNotice ? <p className="notice-text">{userNotice}</p> : null}

        <div className="quiz-list">
          {users.map((user) => (
            <div className="quiz-item" key={user.id}>
              <div>
                <h3>{user.name}</h3>
                <p className="muted">
                  {user.email} | vloga: {user.role}
                </p>
              </div>
              <button
                type="button"
                className="btn secondary"
                disabled={deletingUserId === user.id}
                onClick={() => handleDeleteUser(user)}
              >
                {deletingUserId === user.id ? "Brisem..." : "Brisi uporabnika"}
              </button>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}

export default AdminPage;
