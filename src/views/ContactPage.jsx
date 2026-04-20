import PublicLayout from "../components/PublicLayout";

function ContactPage() {
  return (
    <PublicLayout>
      <section className="page-stack page-stack-centered">
        <article className="card card-narrow">
          <h1>Kontakt</h1>
          <p className="muted">Če imaš vprašanje ali predlog, nas lahko kontaktiraš.</p>
        </article>

        <article className="card card-narrow">
          <h2>Kontaktni podatki</h2>
          <div className="quiz-list">
            <div className="quiz-item">
              <div>
                <h3>Email</h3>
                <p className="muted">support@quizapp.si</p>
              </div>
            </div>
            <div className="quiz-item">
              <div>
                <h3>Telefon</h3>
                <p className="muted">+386 40 123 123</p>
              </div>
            </div>
            <div className="quiz-item">
              <div>
                <h3>Delovni čas</h3>
                <p className="muted">Ponedeljek - petek, 08:00 - 16:00</p>
              </div>
            </div>
          </div>
        </article>
      </section>
    </PublicLayout>
  );
}

export default ContactPage;

