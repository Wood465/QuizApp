import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiRequest } from "../lib/api";

const AuthContext = createContext(null);
const API_BASE = import.meta.env.VITE_API_URL || "";

export function AuthProvider({ children }) {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  const loadCurrentUser = async () => {
    try {
      const data = await apiRequest("/api/auth/me");
      setCurrentUser(data.user || null);
    } catch {
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

  const logout = async () => {
    try {
      await apiRequest("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    setCurrentUser(null);
    setUsers([]);
  };

  const deleteUser = async (userId) => {
    try {
      await apiRequest(`/api/users/${userId}`, { method: "DELETE" });
      setUsers((prev) => prev.filter((item) => item.id !== userId));
      if (currentUser?.id === userId) {
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
