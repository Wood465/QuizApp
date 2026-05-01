import { useEffect, useMemo, useRef, useState } from "react";
import { useQuiz } from "../context/QuizContext";

const QUESTIONS_PER_PAGE = 3;

function formatDuration(seconds) {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.round(seconds)) : 0;
  const mins = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function getQuestionType(question) {
  if (question?.type === "multiple") {
    return "multiple";
  }
  if (question?.type === "text") {
    return "text";
  }
  return "single";
}

function isQuestionAnswered(question, answerValue) {
  const type = getQuestionType(question);

  if (type === "text") {
    return typeof answerValue === "string" && answerValue.trim().length > 0;
  }

  if (type === "multiple") {
    return Array.isArray(answerValue) && answerValue.length > 0;
  }

  return answerValue !== undefined && answerValue !== null && String(answerValue).trim() !== "";
}

function normalizeAnswersForSubmit(quiz, answers) {
  return quiz.questions.map((question, index) => {
    const type = getQuestionType(question);
    const questionKey = question.id || `q-${index + 1}`;
    const answerValue = answers[questionKey];

    if (type === "text") {
      return typeof answerValue === "string" ? answerValue.trim() : "";
    }

    if (type === "multiple") {
      if (!Array.isArray(answerValue)) {
        return [];
      }

      return [...new Set(answerValue
        .map((entry) => Number(entry))
        .filter((entry) => Number.isInteger(entry) && entry >= 0))]
        .sort((a, b) => a - b);
    }

    const parsed = Number(answerValue);
    return Number.isInteger(parsed) ? parsed : -1;
  });
}

function QuizzesPage() {
  const { quizzes, submitQuiz, loading } = useQuiz();

  const [selectedQuizId, setSelectedQuizId] = useState("");
  const [topicFilter, setTopicFilter] = useState("all");
  const [attemptStartedAt, setAttemptStartedAt] = useState(null);
  const [answers, setAnswers] = useState({});
  const [currentPage, setCurrentPage] = useState(0);
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

  const totalPages = selectedQuiz
    ? Math.max(1, Math.ceil(selectedQuiz.questions.length / QUESTIONS_PER_PAGE))
    : 1;
  const isLastPage = currentPage === totalPages - 1;

  const visibleQuestions = useMemo(() => {
    if (!selectedQuiz) {
      return [];
    }

    const start = currentPage * QUESTIONS_PER_PAGE;
    return selectedQuiz.questions.slice(start, start + QUESTIONS_PER_PAGE);
  }, [selectedQuiz, currentPage]);

  useEffect(() => {
    if (!selectedQuiz) {
      return;
    }

    if (currentPage > totalPages - 1) {
      setCurrentPage(totalPages - 1);
    }
  }, [selectedQuiz, currentPage, totalPages]);

  const startQuiz = (quizId) => {
    setSelectedQuizId(quizId);
    setAttemptStartedAt(Date.now());
    setAnswers({});
    setCurrentPage(0);
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

  const toggleMultiAnswer = (questionId, optionIndex, checked) => {
    setAnswers((prev) => {
      const existing = Array.isArray(prev[questionId]) ? prev[questionId] : [];
      const normalizedIndex = String(optionIndex);

      if (checked) {
        return {
          ...prev,
          [questionId]: [...new Set([...existing, normalizedIndex])],
        };
      }

      return {
        ...prev,
        [questionId]: existing.filter((entry) => entry !== normalizedIndex),
      };
    });
  };

  const submit = async () => {
    if (!selectedQuiz) {
      return;
    }

    const hasMissing = selectedQuiz.questions.some(
      (question, index) =>
        !isQuestionAnswered(question, answers[question.id || `q-${index + 1}`]),
    );

    if (hasMissing) {
      setError("Odgovori na vsa vprasanja pred oddajo.");
      return;
    }

    const normalizedAnswers = normalizeAnswersForSubmit(selectedQuiz, answers);
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
      items: Array.isArray(result.entry.review) ? result.entry.review : [],
    });

    setError("");
    setSelectedQuizId("");
    setAttemptStartedAt(null);
    setCurrentPage(0);
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
                  Tema: {quiz.topic} | Tezavnost: {quiz.difficulty} | Vprasanja:{" "}
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

          <div className="quiz-page-controls">
            <p className="muted quiz-page-meta">
              Stran {currentPage + 1} od {totalPages}
            </p>
            <div className="hero-actions">
              <button
                type="button"
                className="btn secondary"
                onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
                disabled={currentPage === 0}
              >
                Previous
              </button>
              <button
                type="button"
                className="btn secondary"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1))}
                disabled={isLastPage}
              >
                Next page
              </button>
            </div>
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
            }}
            className="form-stack"
          >
            {visibleQuestions.map((question, pageQuestionIndex) => {
              const absoluteIndex = currentPage * QUESTIONS_PER_PAGE + pageQuestionIndex;
              const questionType = getQuestionType(question);
              const options = Array.isArray(question.options) ? question.options : [];
              const questionKey = question.id || `q-${absoluteIndex + 1}`;

              return (
                <fieldset key={questionKey} className="question-box">
                  <legend>
                    {absoluteIndex + 1}. {question.text}
                  </legend>

                  {questionType === "text" ? (
                    <label className="text-answer-label">
                      <span>Vnesi odgovor</span>
                      <input
                        className="text-answer-input"
                        type="text"
                        value={typeof answers[questionKey] === "string" ? answers[questionKey] : ""}
                        onChange={(event) =>
                          setAnswers((prev) => ({
                            ...prev,
                            [questionKey]: event.target.value,
                          }))
                        }
                      />
                    </label>
                  ) : (
                    <div className="question-options">
                      {options.map((option, optionIndex) => {
                        if (questionType === "multiple") {
                          const selected = Array.isArray(answers[questionKey])
                            ? answers[questionKey]
                            : [];

                          return (
                            <label key={`${questionKey}-${optionIndex}`} className="radio-row">
                              <input
                                type="checkbox"
                                checked={selected.includes(String(optionIndex))}
                                onChange={(event) =>
                                  toggleMultiAnswer(
                                    questionKey,
                                    optionIndex,
                                    event.target.checked,
                                  )
                                }
                              />
                              <span>{option}</span>
                            </label>
                          );
                        }

                        return (
                          <label key={`${questionKey}-${optionIndex}`} className="radio-row">
                            <input
                              type="radio"
                              name={questionKey}
                              value={optionIndex}
                              checked={answers[questionKey] === String(optionIndex)}
                              onChange={(event) =>
                                setAnswers((prev) => ({
                                  ...prev,
                                  [questionKey]: event.target.value,
                                }))
                              }
                            />
                            <span>{option}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </fieldset>
              );
            })}

            {error ? <p className="error-text">{error}</p> : null}

            <div className="hero-actions">
              {!isLastPage ? (
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1))}
                >
                  Next page
                </button>
              ) : (
                <button className="btn primary" type="button" onClick={submit}>
                  Oddaj kviz
                </button>
              )}
              {currentPage > 0 ? (
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
                >
                  Previous
                </button>
              ) : null}
            </div>
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
