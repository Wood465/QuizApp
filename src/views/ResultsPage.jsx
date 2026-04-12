import { useAuth } from "../context/AuthContext";
import { useQuiz } from "../context/QuizContext";

function ResultsPage() {
  const { currentUser } = useAuth();
  const { results, loading } = useQuiz();

  const myResults = results.filter((item) => item.userId === currentUser.id);

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
          <div className="table-wrap">
            <table className="results-table">
              <thead>
                <tr>
                  <th>Kviz</th>
                  <th>Točke</th>
                  <th>Uspeh</th>
                  <th>Datum</th>
                </tr>
              </thead>
              <tbody>
                {myResults.map((result) => (
                  <tr key={result.id}>
                    <td>{result.quizTitle}</td>
                    <td>
                      {result.score}/{result.total}
                    </td>
                    <td>{result.percentage}%</td>
                    <td>{new Date(result.createdAt).toLocaleString("sl-SI")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </section>
  );
}

export default ResultsPage;

