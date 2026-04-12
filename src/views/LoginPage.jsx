import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function LoginPage() {
  const { login, loginWithGoogle, configError, isAuthenticated, authReady } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const redirectPath = location.state?.from?.pathname || "/dashboard";

  useEffect(() => {
    if (authReady && isAuthenticated) {
      const params = new URLSearchParams(location.search);
      const next = params.get("next") || redirectPath;
      navigate(next, { replace: true });
    }
  }, [authReady, isAuthenticated, location.search]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("error")) {
      setError("Google prijava ni uspela.");
    }
  }, [location.search]);

  const submit = async (event) => {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Vnesi email in geslo.");
      return;
    }

    setIsLoading(true);
    const result = await login({ email, password });
    setIsLoading(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    navigate(redirectPath, { replace: true });
  };

  const startGoogleLogin = () => {
    loginWithGoogle({ nextPath: redirectPath });
  };

  return (
    <main className="simple-page">
      <div className="simple-card">
        <h1>Prijava</h1>
        {configError ? <p className="error-text">{configError}</p> : null}

        <form className="form-stack" onSubmit={submit}>
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
            {isLoading ? "Počakaj..." : "Prijava"}
          </button>
        </form>

        <>
          <div className="auth-divider">ali</div>
          <button type="button" className="btn secondary btn-full" onClick={startGoogleLogin}>
            Nadaljuj z Google
          </button>
        </>

        <p className="muted">
          Še nimaš računa? <Link to="/signup">Registracija</Link>
        </p>
      </div>
    </main>
  );
}

export default LoginPage;
