import { Link } from "react-router-dom";
import PublicLayout from "../components/PublicLayout";

function LandingPage() {
  return (
    <PublicLayout>
      <section className="hero">
        <div>
          <h1>Uči se hitreje z interaktivnimi kvizi</h1>
          <p>
            QuizApp omogoča reševanje kvizov po temah in težavnosti, spremljanje
            rezultatov ter napredka. Vključen je tudi admin del za upravljanje
            vsebine.
          </p>
          <div className="hero-actions">
            <Link className="btn primary" to="/signup">
              Registracija
            </Link>
            <Link className="btn secondary" to="/login">
              Prijava
            </Link>
          </div>
        </div>

        <article className="hero-card">
          <h2>Kaj dobiš?</h2>
          <div className="stats">
            <div className="stat">
              <strong>Teme</strong>
              <span>različna področja znanja</span>
            </div>
            <div className="stat">
              <strong>Težavnosti</strong>
              <span>easy, medium, hard</span>
            </div>
            <div className="stat">
              <strong>Statistika</strong>
              <span>rezultati in uspešnost</span>
            </div>
            <div className="stat">
              <strong>Admin</strong>
              <span>CRUD kvizov in vprašanj</span>
            </div>
          </div>
        </article>
      </section>
    </PublicLayout>
  );
}

export default LandingPage;

