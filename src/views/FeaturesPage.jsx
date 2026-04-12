import PublicLayout from "../components/PublicLayout";

function FeaturesPage() {
  return (
    <PublicLayout>
      <section className="page-stack">
        <article className="card">
          <h1>Funkcije</h1>
          <p className="muted">
            Pregled glavnih funkcionalnosti, ki jih ponuja QuizApp.
          </p>
        </article>

        <div className="features">
          <article className="feature">
            <h3>Avtentikacija</h3>
            <p>Prijava, registracija in Google login z varnimi sejami.</p>
          </article>
          <article className="feature">
            <h3>Reševanje kvizov</h3>
            <p>Več tem in težavnosti z avtomatskim izračunom rezultata.</p>
          </article>
          <article className="feature">
            <h3>Rezultati</h3>
            <p>Zgodovina reševanj in pregled uspešnosti po uporabniku.</p>
          </article>
          <article className="feature">
            <h3>Admin panel</h3>
            <p>Dodajanje, urejanje in brisanje kvizov ter upravljanje uporabnikov.</p>
          </article>
          <article className="feature">
            <h3>Profil</h3>
            <p>Urejanje osnovnih podatkov uporabnika v enem mestu.</p>
          </article>
          <article className="feature">
            <h3>Baza podatkov</h3>
            <p>Podatki se hranijo v PostgreSQL (Neon), ne v local storage.</p>
          </article>
        </div>
      </section>
    </PublicLayout>
  );
}

export default FeaturesPage;

