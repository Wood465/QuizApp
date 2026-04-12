import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useQuiz } from "../context/QuizContext";

const initialQuestion = { text: "", options: "", answerIndex: 0 };

function parseQuestions(rawQuestions) {
  return rawQuestions
    .filter((item) => item.text.trim() && item.options.trim())
    .map((item, idx) => {
      const options = item.options
        .split("|")
        .map((entry) => entry.trim())
        .filter(Boolean);

      return {
        id: `q-${idx + 1}`,
        text: item.text.trim(),
        options,
        answerIndex: Math.min(Math.max(Number(item.answerIndex), 0), options.length - 1),
      };
    })
    .filter((item) => item.options.length >= 2);
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
    setQuestions(
      quiz.questions.map((item) => ({
        text: item.text,
        options: item.options.join(" | "),
        answerIndex: item.answerIndex,
      })),
    );
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

    const parsedQuestions = parseQuestions(questions);
    if (!title.trim() || !topic.trim()) {
      setError("Naslov in tema sta obvezna.");
      return;
    }
    if (parsedQuestions.length === 0) {
      setError("Dodaj vsaj eno vprašanje z vsaj dvema možnostma.");
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
        setNotice("Kviz je bil uspešno posodobljen.");
      } else {
        await addQuiz(payload);
        setNotice("Kviz je bil uspešno dodan.");
      }
      resetForm();
    } catch (apiError) {
      setError(apiError.message || "Shranjevanje kviza ni uspelo.");
    } finally {
      setIsSavingQuiz(false);
    }
  };

  const handleDeleteUser = async (user) => {
    const confirmed = window.confirm(`Ali želiš izbrisati uporabnika ${user.name}?`);
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
      setUserNotice("Izbrisal si svoj račun. Za nadaljevanje se ponovno prijavi.");
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
            Težavnost
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

          <h3>Vprašanja</h3>
          {questions.map((question, index) => (
            <div key={index} className="question-admin">
              <label>
                Besedilo vprašanja
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
                Možnosti (ločene z |)
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
              <div className="hero-actions">
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => removeQuestionRow(index)}
                  disabled={isSavingQuiz || questions.length <= 1}
                >
                  Odstrani vprašanje
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
              Dodaj vprašanje
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
                Prekliči urejanje
              </button>
            ) : null}
          </div>
        </form>
      </article>

      <article className="card">
        <h2>Obstoječi kvizi</h2>
        {quizzes.length === 0 ? (
          <p className="muted">Trenutno ni nobenega kviza v bazi.</p>
        ) : (
          <div className="quiz-list">
            {quizzes.map((quiz) => (
              <div className="quiz-item" key={quiz.id}>
                <div>
                  <h3>{quiz.title}</h3>
                  <p className="muted">
                    {quiz.topic} | {quiz.difficulty} | {quiz.questions.length} vprašanj
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
                        `Ali želiš izbrisati kviz \"${quiz.title}\"?`,
                      );
                      if (!confirmed) {
                        return;
                      }
                      setDeletingQuizId(quiz.id);
                      setError("");
                      setNotice("");
                      try {
                        await deleteQuiz(quiz.id);
                        setNotice("Kviz je bil uspešno izbrisan.");
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
                    {deletingQuizId === quiz.id ? "Brišem..." : "Briši"}
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
                {deletingUserId === user.id ? "Brišem..." : "Briši uporabnika"}
              </button>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}

export default AdminPage;
