import { NavLink } from "react-router-dom";
import { useState } from "react";

function PublicLayout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <header className="navbar">
        <div className="container navbar-inner">
          <NavLink to="/" className="logo" onClick={closeMenu}>
            Quiz<span>App</span>
          </NavLink>

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
            <NavLink to="/funkcije" onClick={closeMenu}>
              Funkcije
            </NavLink>
            <NavLink to="/zakaj" onClick={closeMenu}>
              Zakaj mi
            </NavLink>
            <NavLink to="/kontakt" onClick={closeMenu}>
              Kontakt
            </NavLink>
          </nav>

          <div className="desktop-auth">
            <NavLink className="btn primary" to="/login" onClick={closeMenu}>
              Prijava
            </NavLink>
          </div>
        </div>
      </header>

      <main className="container section">{children}</main>

      <footer>
        <div className="container">© 2026 QuizApp. Vse pravice pridržane.</div>
      </footer>
    </>
  );
}

export default PublicLayout;

