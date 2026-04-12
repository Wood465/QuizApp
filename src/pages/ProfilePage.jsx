import { useState } from "react";
import { useAuth } from "../context/AuthContext";

function ProfilePage() {
  const { currentUser, updateProfile } = useAuth();

  const [name, setName] = useState(currentUser.name);
  const [email, setEmail] = useState(currentUser.email);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const submit = (event) => {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!name.trim() || !email.trim()) {
      setError("Ime in email sta obvezna.");
      return;
    }

    const result = updateProfile({ name, email, password });
    if (!result.ok) {
      setError(result.message);
      return;
    }

    setNotice("Profil je uspešno posodobljen.");
    setPassword("");
  };

  return (
    <section className="page-stack">
      <article className="card card-narrow">
        <h1>Moj profil</h1>
        <form className="form-stack" onSubmit={submit}>
          <label>
            Ime
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>

          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          <label>
            Novo geslo (opcijsko)
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          {error ? <p className="error-text">{error}</p> : null}
          {notice ? <p className="notice-text">{notice}</p> : null}

          <button type="submit" className="btn primary">
            Shrani spremembe
          </button>
        </form>
      </article>
    </section>
  );
}

export default ProfilePage;
