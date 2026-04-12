import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useQuiz } from "../context/QuizContext";

function DashboardPage() {
  const { currentUser } = useAuth();
  const { quizzes, results, loading } = useQuiz();

  const myResults = results.filter((item) => item.userId === currentUser.id);
  const solved = myResults.length;
  const best = myResults.length
    ? Math.max(...myResults.map((item) => item.percentage))
    : 0;
  const average =
    myResults.length > 0
      ? Math.round(
          myResults.reduce((acc, item) => acc + item.percentage, 0) /
            myResults.length,
        )
      : 0;

  return (
    <section className="page-grid">
      <article className="card">
        <h1>Dobrodošel, {currentUser.name}</h1>
        <p className="muted">
          Nadaljuj z učenjem. Na voljo imaš {quizzes.length} kvizov različnih tem
          in težavnosti.
        </p>     
        <div className="hero-actions">
          <Link className="btn primary" to="/quizzes">
            Rešuj kvize
          </Link>
          <Link className="btn secondary" to="/results">
            Poglej rezultate
          </Link>
        </div>
        {loading ? <p className="muted">Nalagam podatke...</p> : null}
      </article>

      <article className="card">
        <h2>Tvoja statistika</h2>
        <div className="stats">
          <div className="stat">
            <strong>{solved}</strong>
            <span>rešenih kvizov</span>
          </div>
          <div className="stat">
            <strong>{best}%</strong>
            <span>najboljši rezultat</span>
          </div>
          <div className="stat">
            <strong>{average}%</strong>
            <span>povprečje</span>
          </div>
          <div className="stat">
            <strong>{quizzes.length}</strong>
            <span>skupno kvizov</span>
          </div>
        </div>
      </article>
    </section>
  );
}

export default DashboardPage;

