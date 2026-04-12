import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const redirectPath = location.state?.from?.pathname || "/dashboard";

  const submit = (event) => {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Vnesi email in geslo.");
      return;
    }

    const result = login({ email, password });
    if (!result.ok) {
      setError(result.message);
      return;
    }

    navigate(redirectPath, { replace: true });
  };

  return (
    <main className="simple-page">
      <div className="simple-card">
        <h1>Prijava</h1>
        <p className="muted">
          Demo admin račun: <strong>admin@smartquiz.app</strong> / <strong>admin123</strong>
        </p>

        <form className="form-stack" onSubmit={submit}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          <label>
            Geslo
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          {error ? <p className="error-text">{error}</p> : null}

          <button type="submit" className="btn primary">
            Prijava
          </button>
        </form>

        <p className="muted">
          Še nimaš računa? <Link to="/signup">Registracija</Link>
        </p>
      </div>
    </main>
  );
}

export default LoginPage;
