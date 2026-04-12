import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useQuiz } from "../context/QuizContext";

function ResultsPage() {
  const { currentUser } = useAuth();
  const { results, loading } = useQuiz();
  const [openedResultId, setOpenedResultId] = useState(null);

  const myResults = results.filter((item) => item.userId === currentUser.id);

  const toggleDetails = (resultId) => {
    setOpenedResultId((prev) => (prev === resultId ? null : resultId));
  };

  return (
    <section className="page-stack">
      <article className="card">
        <h1>Rezultati</h1>
        <p className="muted">Pregled vseh rešenih kvizov in dosežkov.</p>

        {loading ? (
          <p className="muted">Nalagam rezultate...</p>
        ) : myResults.length === 0 ? (
          <p className="muted">Še nimaš rezultatov. Začni prvi kviz.</p>
        ) : (
          <div className="results-history">
            {myResults.map((result) => {
              const review = Array.isArray(result.review) ? result.review : [];
              const wrongItems = review.filter((item) => item && !item.isCorrect);
              const hasReview = review.length > 0;
              const isOpen = openedResultId === result.id;

              return (
                <article key={result.id} className="review-item">
                  <div className="results-head">
                    <div>
                      <h3>{result.quizTitle}</h3>
                      <p className="muted">
                        {result.score}/{result.total} ({result.percentage}%) -{" "}
                        {new Date(result.createdAt).toLocaleString("sl-SI")}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn secondary"
                      onClick={() => toggleDetails(result.id)}
                    >
                      {isOpen ? "Skrij podrobnosti" : "Prikaži podrobnosti"}
                    </button>
                  </div>

                  {isOpen ? (
                    hasReview ? (
                      wrongItems.length === 0 ? (
                        <p className="review-status review-status-correct">
                          Pri tem poskusu nisi imel nobene napake.
                        </p>
                      ) : (
                        <div className="review-list">
                          {wrongItems.map((item, index) => (
                            <article key={`${result.id}-${item.questionId}`} className="review-item review-item-wrong">
                              <h3>
                                {index + 1}. {item.text}
                              </h3>
                              <p className="review-answer review-answer-wrong">
                                <strong>Tvoj odgovor:</strong> {item.selectedOption}
                              </p>
                              <p className="review-answer review-answer-correct">
                                <strong>Pravilen odgovor:</strong> {item.correctOption}
                              </p>
                            </article>
                          ))}
                        </div>
                      )
                    ) : (
                      <p className="muted">
                        Za ta starejši rezultat podrobnosti odgovorov niso na voljo.
                      </p>
                    )
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </article>
    </section>
  );
}

export default ResultsPage;

