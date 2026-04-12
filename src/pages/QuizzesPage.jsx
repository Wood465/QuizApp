import { useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useQuiz } from "../context/QuizContext";

function QuizzesPage() {
  const { currentUser } = useAuth();
  const { quizzes, submitQuiz } = useQuiz();

  const [selectedQuizId, setSelectedQuizId] = useState("");
  const [answers, setAnswers] = useState({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const selectedQuiz = useMemo(
    () => quizzes.find((item) => item.id === selectedQuizId),
    [quizzes, selectedQuizId],
  );

  const startQuiz = (quizId) => {
    setSelectedQuizId(quizId);
    setAnswers({});
    setError("");
    setNotice("");
  };

  const submit = (event) => {
    event.preventDefault();
    if (!selectedQuiz) {
      return;
    }

    if (Object.keys(answers).length !== selectedQuiz.questions.length) {
      setError("Odgovori na vsa vprašanja pred oddajo.");
      return;
    }

    const normalizedAnswers = selectedQuiz.questions.map((question) =>
      Number(answers[question.id]),
    );

    const result = submitQuiz({
      userId: currentUser.id,
      quizId: selectedQuiz.id,
      answers: normalizedAnswers,
    });

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setNotice(
      `Kviz uspešno oddan. Rezultat: ${result.entry.score}/${result.entry.total} (${result.entry.percentage}%).`,
    );
    setError("");
    setSelectedQuizId("");
  };

  return (
    <section className="page-stack">
      <article className="card">
        <h1>Kvizi</h1>
        <p className="muted">Izberi kviz, odgovori na vprašanja in oddaj rezultat.</p>

        <div className="quiz-list">
          {quizzes.map((quiz) => (
            <div className="quiz-item" key={quiz.id}>
              <div>
                <h3>{quiz.title}</h3>
                <p className="muted">
                  Tema: {quiz.topic} | Težavnost: {quiz.difficulty} | Vprašanja: {quiz.questions.length}
                </p>
              </div>
              <button
                type="button"
                className="btn primary"
                onClick={() => startQuiz(quiz.id)}
              >
                Začni kviz
              </button>
            </div>
          ))}
        </div>
      </article>

      {selectedQuiz ? (
        <article className="card">
          <h2>{selectedQuiz.title}</h2>
          <form onSubmit={submit} className="form-stack">
            {selectedQuiz.questions.map((question, index) => (
              <fieldset key={question.id} className="question-box">
                <legend>
                  {index + 1}. {question.text}
                </legend>
                {question.options.map((option, optionIndex) => (
                  <label key={option} className="radio-row">
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
                    {option}
                  </label>
                ))}
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
    </section>
  );
}

export default QuizzesPage;
