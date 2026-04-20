import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";

function ProfilePage() {
  const { currentUser, updateProfile } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    setName(currentUser.name || "");
    setEmail(currentUser.email || "");
    setAvatarUrl(currentUser.avatarUrl || "");
  }, [currentUser]);

  if (!currentUser) {
    return null;
  }

  const isGoogleUser = currentUser.provider === "google";

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!name.trim() || !email.trim()) {
      setError("Ime in email sta obvezna.");
      return;
    }

    setIsSaving(true);
    const result = await updateProfile({
      name,
      email,
      avatarUrl,
      ...(isGoogleUser ? {} : { password }),
    });
    setIsSaving(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setNotice("Profil je uspešno posodobljen.");
    setPassword("");
  };

  return (
    <section className="page-stack page-stack-centered">
      <article className="card card-narrow">
        <h1>Moj profil</h1>
        <form className="form-stack" onSubmit={submit}>
          <label>
            Ime
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={isSaving}
            />
          </label>

          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={isSaving}
            />
          </label>

          <label>
            URL profilne slike (opcijsko)
            <input
              type="url"
              value={avatarUrl}
              onChange={(event) => setAvatarUrl(event.target.value)}
              placeholder="https://example.com/slika.jpg"
              disabled={isSaving}
            />
          </label>

          {isGoogleUser ? (
            <p className="muted">
              Prijavljen si z Google računom, zato menjava gesla tukaj ni na voljo.
            </p>
          ) : (
            <label>
              Novo geslo (opcijsko)
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={isSaving}
              />
            </label>
          )}

          {error ? <p className="error-text">{error}</p> : null}
          {notice ? <p className="notice-text">{notice}</p> : null}

          <button type="submit" className="btn primary" disabled={isSaving}>
            {isSaving ? "Shranjujem..." : "Shrani spremembe"}
          </button>
        </form>
      </article>
    </section>
  );
}

export default ProfilePage;
