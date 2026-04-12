import { useMemo, useRef, useState } from "react";
import { useQuiz } from "../context/QuizContext";

function formatDuration(seconds) {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.round(seconds)) : 0;
  const mins = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function buildAttemptReview(quiz, normalizedAnswers) {
  return quiz.questions.map((question, index) => {
    const selectedIndex = Number(normalizedAnswers[index]);
    const correctIndex = Number(question.answerIndex);
    const options = Array.isArray(question.options) ? question.options : [];
    const isCorrect = selectedIndex === correctIndex;

    return {
      questionId: question.id || `q-${index + 1}`,
      text: question.text,
      selectedOption: options[selectedIndex] ?? "Odgovor ni bil izbran.",
      correctOption: options[correctIndex] ?? "Pravilen odgovor ni nastavljen.",
      isCorrect,
    };
  });
}

function QuizzesPage() {
  const { quizzes, submitQuiz, loading } = useQuiz();

  const [selectedQuizId, setSelectedQuizId] = useState("");
  const [topicFilter, setTopicFilter] = useState("all");
  const [attemptStartedAt, setAttemptStartedAt] = useState(null);
  const [answers, setAnswers] = useState({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [lastReview, setLastReview] = useState(null);
  const activeQuizRef = useRef(null);
  const activeQuizHeadingRef = useRef(null);

  const availableTopics = useMemo(
    () => [...new Set(quizzes.map((quiz) => quiz.topic).filter(Boolean))].sort(),
    [quizzes],
  );

  const filteredQuizzes = useMemo(
    () =>
      topicFilter === "all"
        ? quizzes
        : quizzes.filter((quiz) => quiz.topic === topicFilter),
    [quizzes, topicFilter],
  );

  const selectedQuiz = useMemo(
    () => quizzes.find((item) => item.id === selectedQuizId),
    [quizzes, selectedQuizId],
  );

  const startQuiz = (quizId) => {
    setSelectedQuizId(quizId);
    setAttemptStartedAt(Date.now());
    setAnswers({});
    setError("");
    setNotice("");
    setLastReview(null);

    setTimeout(() => {
      if (!activeQuizRef.current) {
        return;
      }

      activeQuizRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      activeQuizHeadingRef.current?.focus({ preventScroll: true });
    }, 0);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!selectedQuiz) {
      return;
    }

    if (Object.keys(answers).length !== selectedQuiz.questions.length) {
      setError("Odgovori na vsa vprasanja pred oddajo.");
      return;
    }

    const normalizedAnswers = selectedQuiz.questions.map((question) =>
      Number(answers[question.id]),
    );
    const durationSeconds = attemptStartedAt
      ? Math.max(1, Math.round((Date.now() - attemptStartedAt) / 1000))
      : 1;

    const result = await submitQuiz({
      quizId: selectedQuiz.id,
      answers: normalizedAnswers,
      durationSeconds,
    });

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setNotice(
      `Kviz uspesno oddan. Rezultat: ${result.entry.score}/${result.entry.total} (${result.entry.percentage}%), cas: ${formatDuration(durationSeconds)}.`,
    );
    setLastReview({
      quizTitle: selectedQuiz.title,
      score: result.entry.score,
      total: result.entry.total,
      percentage: result.entry.percentage,
      items: buildAttemptReview(selectedQuiz, normalizedAnswers),
    });
    setError("");
    setSelectedQuizId("");
    setAttemptStartedAt(null);
  };

  return (
    <section className="page-stack">
      <article className="card">
        <h1>Kvizi</h1>
        <p className="muted">Izberi kviz, odgovori na vprasanja in oddaj rezultat.</p>

        {loading ? <p className="muted">Nalagam kvize...</p> : null}

        <div className="quiz-filters">
          <label htmlFor="topic-filter">Filter po temi</label>
          <select
            id="topic-filter"
            value={topicFilter}
            onChange={(event) => setTopicFilter(event.target.value)}
          >
            <option value="all">Vse teme</option>
            {availableTopics.map((topic) => (
              <option key={topic} value={topic}>
                {topic}
              </option>
            ))}
          </select>
        </div>

        <div className="quiz-list">
          {filteredQuizzes.map((quiz) => (
            <div className="quiz-item" key={quiz.id}>
              <div>
                <h3>{quiz.title}</h3>
                <p className="muted">
                  Tema: {quiz.topic} | Tezavnost: {quiz.difficulty} | Vprasanja: {" "}
                  {quiz.questions.length}
                </p>
              </div>
              <button type="button" className="btn primary" onClick={() => startQuiz(quiz.id)}>
                Zacni kviz
              </button>
            </div>
          ))}
          {!loading && filteredQuizzes.length === 0 ? (
            <p className="muted">Za izbrano temo trenutno ni kvizov.</p>
          ) : null}
        </div>
      </article>

      {selectedQuiz ? (
        <article className="card" ref={activeQuizRef}>
          <h2 ref={activeQuizHeadingRef} tabIndex={-1}>
            {selectedQuiz.title}
          </h2>
          <form onSubmit={submit} className="form-stack">
            {selectedQuiz.questions.map((question, index) => (
              <fieldset key={question.id} className="question-box">
                <legend>
                  {index + 1}. {question.text}
                </legend>
                <div className="question-options">
                  {question.options.map((option, optionIndex) => (
                    <label key={`${question.id}-${optionIndex}`} className="radio-row">
                      <input
                        type="radio"
                        name={question.id}
                        value={optionIndex}
                        checked={answers[question.id] === String(optionIndex)}
                        onChange={(event) =>
                          setAnswers((prev) => ({
                            ...prev,
                            [question.id]: event.target.value,
                          }))
                        }
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}

            {error ? <p className="error-text">{error}</p> : null}
            <button className="btn primary" type="submit">
              Oddaj kviz
            </button>
          </form>
        </article>
      ) : null}

      {notice ? <p className="notice-text">{notice}</p> : null}

      {lastReview ? (
        <article className="card">
          <h2>Pregled odgovorov</h2>
          <p className="muted">
            {lastReview.quizTitle} - {lastReview.score}/{lastReview.total} ({lastReview.percentage}
            %)
          </p>
          <div className="review-list">
            {lastReview.items.map((item, index) => (
              <article
                key={item.questionId}
                className={`review-item ${item.isCorrect ? "review-item-correct" : "review-item-wrong"}`}
              >
                <h3>
                  {index + 1}. {item.text}
                </h3>
                <p className="review-answer">
                  <strong>Tvoj odgovor:</strong> {item.selectedOption}
                </p>
                <p className="review-answer">
                  <strong>Pravilen odgovor:</strong> {item.correctOption}
                </p>
                <p className={`review-status ${item.isCorrect ? "review-status-correct" : "review-status-wrong"}`}>
                  {item.isCorrect ? "Pravilno" : "Napacno"}
                </p>
              </article>
            ))}
          </div>
        </article>
      ) : null}
    </section>
  );
}

export default QuizzesPage;
