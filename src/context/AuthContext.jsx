import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiRequest, getStoredToken, setStoredToken } from "../lib/api";

const AuthContext = createContext(null);
const API_BASE =
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined" ? window.location.origin : "");

export function AuthProvider({ children }) {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  const loadCurrentUser = async () => {
    const token = getStoredToken();
    if (!token) {
      setCurrentUser(null);
      setAuthReady(true);
      return;
    }

    try {
      const data = await apiRequest("/api/auth/me");
      setCurrentUser(data.user || null);
    } catch {
      setStoredToken("");
      setCurrentUser(null);
    } finally {
      setAuthReady(true);
    }
  };

  const loadUsersIfAdmin = async (user) => {
    if (!user || user.role !== "admin") {
      setUsers([]);
      return;
    }

    try {
      const data = await apiRequest("/api/users");
      setUsers(data.users || []);
    } catch {
      setUsers([]);
    }
  };

  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    loadUsersIfAdmin(currentUser);
  }, [currentUser]);

  const register = async ({ name, email, password }) => {
    try {
      const data = await apiRequest("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });

      setStoredToken(data.token || "");
      setCurrentUser(data.user || null);
      return { ok: true };
    } catch (error) {
      return { ok: false, message: error.message };
    }
  };

  const login = async ({ email, password }) => {
    try {
      const data = await apiRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      setStoredToken(data.token || "");
      setCurrentUser(data.user || null);
      return { ok: true };
    } catch (error) {
      return { ok: false, message: error.message };
    }
  };

  const loginWithGoogle = ({ nextPath = "/dashboard" } = {}) => {
    const safeNext = nextPath.startsWith("/") ? nextPath : "/dashboard";
    const frontend = encodeURIComponent(window.location.origin);
    window.location.href = `${API_BASE}/api/auth/google/start?next=${encodeURIComponent(
      safeNext,
    )}&frontend=${frontend}`;
  };

  const loginWithToken = async (token) => {
    if (!token) {
      return { ok: false, message: "Missing token." };
    }

    try {
      setStoredToken(token);
      const data = await apiRequest("/api/auth/me");
      setCurrentUser(data.user || null);
      return { ok: true };
    } catch {
      setStoredToken("");
      setCurrentUser(null);
      return { ok: false, message: "Google prijava ni uspela." };
    }
  };

  const logout = async () => {
    setStoredToken("");
    setCurrentUser(null);
    setUsers([]);
  };

  const deleteUser = async (userId) => {
    try {
      await apiRequest(`/api/users/${userId}`, { method: "DELETE" });
      setUsers((prev) => prev.filter((item) => item.id !== userId));
      if (currentUser?.id === userId) {
        setStoredToken("");
        setCurrentUser(null);
      }
      return { ok: true };
    } catch (error) {
      return { ok: false, message: error.message };
    }
  };

  const updateProfile = async ({ name, email, password }) => {
    try {
      const data = await apiRequest("/api/auth/profile", {
        method: "PUT",
        body: JSON.stringify({ name, email, password }),
      });

      if (data.token) {
        setStoredToken(data.token);
      }
      setCurrentUser(data.user || null);
      return { ok: true };
    } catch (error) {
      return { ok: false, message: error.message };
    }
  };

  const value = useMemo(
    () => ({
      users,
      currentUser,
      authReady,
      isAuthenticated: Boolean(currentUser),
      configError: "",
      register,
      login,
      loginWithGoogle,
      loginWithToken,
      logout,
      deleteUser,
      updateProfile,
    }),
    [users, currentUser, authReady],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }
  return context;
}
