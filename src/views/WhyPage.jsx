import PublicLayout from "../components/PublicLayout";

function WhyPage() {
  return (
    <PublicLayout>
      <section className="page-stack">
        <article className="card">
          <h1>Zakaj QuizApp</h1>
          <p className="muted">
            QuizApp je narejen za hitro učenje, enostavno uporabo in jasen pregled napredka.
          </p>
        </article>

        <article className="card">
          <h2>Prednosti</h2>
          <div className="quiz-list">
            <div className="quiz-item">
              <div>
                <h3>Preprost uporabniški tok</h3>
                <p className="muted">Od prijave do reševanja kviza v nekaj klikih.</p>
              </div>
            </div>
            <div className="quiz-item">
              <div>
                <h3>Jasen napredek</h3>
                <p className="muted">Vidiš rezultate, odstotke in zgodovino rešenih kvizov.</p>
              </div>
            </div>
            <div className="quiz-item">
              <div>
                <h3>Upravljanje vsebine</h3>
                <p className="muted">Admin lahko hitro doda ali popravi vprašanja in kvize.</p>
              </div>
            </div>
            <div className="quiz-item">
              <div>
                <h3>Delovanje v oblaku</h3>
                <p className="muted">Aplikacija je javno dostopna in uporablja online bazo.</p>
              </div>
            </div>
          </div>
        </article>
      </section>
    </PublicLayout>
  );
}

export default WhyPage;

