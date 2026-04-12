import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function SignupPage() {
  const { register, loginWithGoogle, loginWithToken, configError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const hasGoogleClientId = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get("token");
    const next = params.get("next") || "/dashboard";
    const errorCode = params.get("error");

    if (errorCode) {
      setError("Google prijava ni uspela.");
      return;
    }

    if (!token) {
      return;
    }

    const applyToken = async () => {
      setIsLoading(true);
      const result = await loginWithToken(token);
      setIsLoading(false);

      if (!result.ok) {
        setError(result.message);
        return;
      }

      navigate(next, { replace: true });
    };

    applyToken();
  }, [location.search]);

  const submit = async (event) => {
    event.preventDefault();
    setError("");

    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("Izpolni vsa polja.");
      return;
    }

    if (password.length < 6) {
      setError("Geslo mora imeti vsaj 6 znakov.");
      return;
    }

    setIsLoading(true);
    const result = await register({ name, email, password });
    setIsLoading(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    navigate("/dashboard", { replace: true });
  };

  const startGoogleLogin = () => {
    loginWithGoogle({ nextPath: "/dashboard" });
  };

  return (
    <main className="simple-page">
      <div className="simple-card">
        <h1>Registracija</h1>
        {configError ? <p className="error-text">{configError}</p> : null}

        <form className="form-stack" onSubmit={submit}>
          <label>
            Ime
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={isLoading}
            />
          </label>

          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={isLoading}
            />
          </label>

          <label>
            Geslo
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={isLoading}
            />
          </label>

          {error ? <p className="error-text">{error}</p> : null}

          <button type="submit" className="btn primary" disabled={isLoading || Boolean(configError)}>
            {isLoading ? "Počakaj..." : "Ustvari račun"}
          </button>
        </form>

        {hasGoogleClientId ? (
          <>
            <div className="auth-divider">ali</div>
            <button type="button" className="btn secondary btn-full" onClick={startGoogleLogin}>
              Nadaljuj z Google
            </button>
          </>
        ) : null}

        <p className="muted">
          Že imaš račun? <Link to="/login">Prijava</Link>
        </p>
      </div>
    </main>
  );
}

export default SignupPage;
