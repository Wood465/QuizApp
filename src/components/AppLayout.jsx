import { NavLink, Outlet } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";

function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { currentUser, logout } = useAuth();

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <header className="navbar app-navbar">
        <div className="container navbar-inner">
          <NavLink to="/dashboard" className="logo" onClick={closeMenu}>
            Smart<span>Quiz</span>
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

          <nav className={`nav-links app-links ${menuOpen ? "open" : ""}`}>
            <NavLink to="/dashboard" onClick={closeMenu}>
              Dashboard
            </NavLink>
            <NavLink to="/quizzes" onClick={closeMenu}>
              Kvizi
            </NavLink>
            <NavLink to="/results" onClick={closeMenu}>
              Rezultati
            </NavLink>
            <NavLink to="/profile" onClick={closeMenu}>
              Profil
            </NavLink>
            {currentUser?.role === "admin" ? (
              <NavLink to="/admin" onClick={closeMenu}>
                Admin
              </NavLink>
            ) : null}
          </nav>

          <div className="desktop-auth app-user">
            <span>{currentUser?.name}</span>
            <button
              type="button"
              className="btn secondary"
              onClick={async () => {
                await logout();
                closeMenu();
              }}
            >
              Odjava
            </button>
          </div>
        </div>
      </header>

      <main className="container app-main">
        <Outlet />
      </main>
    </>
  );
}

export default AppLayout;
