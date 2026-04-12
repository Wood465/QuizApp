import { Link } from "react-router-dom";
import { useState } from "react";

function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="navbar">
        <div className="container navbar-inner">
          <Link to="/" className="logo">
            Smart<span>Quiz</span>
          </Link>

          <button
            className="hamburger"
            aria-label="Odpri meni"
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            <span />
            <span />
            <span />
          </button>

          <nav className={`nav-links ${menuOpen ? "open" : ""}`}>
            <a href="#funkcije" onClick={() => setMenuOpen(false)}>
              Funkcionalnosti
            </a>
            <a href="#zakaj" onClick={() => setMenuOpen(false)}>
              Zakaj Smart Quiz
            </a>
            <a href="#kontakt" onClick={() => setMenuOpen(false)}>
              Kontakt
            </a>
          </nav>

          <div className="desktop-auth">
            <Link className="btn primary" to="/login">
              Prijava
            </Link>
          </div>
        </div>
      </header>

      <main className="container">
        <section className="hero">
          <div>
            <h1>Uči se hitreje z interaktivnimi kvizi</h1>
            <p>
              Smart Quiz App omogoča reševanje kvizov po temah in težavnosti,
              spremljanje rezultatov ter napredka. Vključen je tudi admin del za
              upravljanje vsebine.
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

          <article className="hero-card" id="zakaj">
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

        <section className="section" id="funkcije">
          <h2 className="section-title">Funkcionalnosti</h2>
          <div className="features">
            <article className="feature">
              <h3>Avtentikacija</h3>
              <p>Registracija, prijava in zaščiten dostop do vsebine.</p>
            </article>
            <article className="feature">
              <h3>Reševanje kvizov</h3>
              <p>Jasna vprašanja, takojšen izračun rezultata in zgodovina.</p>
            </article>
            <article className="feature">
              <h3>Admin upravljanje</h3>
              <p>Dodajanje, urejanje in brisanje kvizov samo za admin uporabnike.</p>
            </article>
          </div>
        </section>
      </main>

      <footer id="kontakt">
        <div className="container">© 2026 SmartQuiz. Vse pravice pridržane.</div>
      </footer>
    </>
  );
}

export default LandingPage;
