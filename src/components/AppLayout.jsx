import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";

function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [avatarLoadError, setAvatarLoadError] = useState(false);
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    setAvatarLoadError(false);
  }, [currentUser?.avatarUrl]);

  const avatarUrl = (currentUser?.avatarUrl || "").trim();
  const userInitial = (currentUser?.name || "?").trim().charAt(0).toUpperCase() || "?";
  const showAvatarImage = Boolean(avatarUrl) && !avatarLoadError;

  return (
    <>
      <header className="navbar app-navbar">
        <div className="container navbar-inner">
          <NavLink to="/dashboard" className="logo" onClick={closeMenu}>
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

          <nav className={`nav-links app-links ${menuOpen ? "open" : ""}`}>
            <NavLink to="/dashboard" onClick={closeMenu}>
              Dashboard
            </NavLink>
            <NavLink to="/quizzes" onClick={closeMenu}>
              Kvizi
            </NavLink>
            <NavLink to="/leaderboard" onClick={closeMenu}>
              Leaderboard
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
            <div className="app-user-info">
              <span className="app-avatar" aria-hidden="true">
                {showAvatarImage ? (
                  <img
                    src={avatarUrl}
                    alt=""
                    onError={() => setAvatarLoadError(true)}
                  />
                ) : (
                  userInitial
                )}
              </span>
              <span>{currentUser?.name}</span>
            </div>
            <button
              type="button"
              className="btn secondary"
              onClick={async () => {
                await logout();
                closeMenu();
                navigate("/", { replace: true });
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
