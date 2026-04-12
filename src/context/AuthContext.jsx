import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { createId } from "../utils/id";
import { KEYS, loadFromStorage, saveToStorage } from "../utils/storage";

const AuthContext = createContext(null);

const defaultAdmin = {
  id: "admin-1",
  name: "Admin",
  email: "admin@smartquiz.app",
  password: "admin123",
  role: "admin",
};

export function AuthProvider({ children }) {
  const [users, setUsers] = useState(() => {
    const stored = loadFromStorage(KEYS.users, []);
    return stored.length ? stored : [defaultAdmin];
  });
  const [currentUser, setCurrentUser] = useState(() =>
    loadFromStorage(KEYS.currentUser, null),
  );

  useEffect(() => {
    saveToStorage(KEYS.users, users);
  }, [users]);

  useEffect(() => {
    saveToStorage(KEYS.currentUser, currentUser);
  }, [currentUser]);

  const register = ({ name, email, password }) => {
    const normalizedEmail = email.trim().toLowerCase();
    const userExists = users.some((user) => user.email === normalizedEmail);
    if (userExists) {
      return { ok: false, message: "User with this email already exists." };
    }

    const newUser = {
      id: createId(),
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: "user",
    };

    setUsers((prev) => [...prev, newUser]);
    setCurrentUser(newUser);
    return { ok: true };
  };

  const login = ({ email, password }) => {
    const normalizedEmail = email.trim().toLowerCase();
    const matchedUser = users.find(
      (user) => user.email === normalizedEmail && user.password === password,
    );

    if (!matchedUser) {
      return { ok: false, message: "Invalid email or password." };
    }

    setCurrentUser(matchedUser);
    return { ok: true };
  };

  const logout = () => setCurrentUser(null);

  const deleteUser = (userId) => {
    const userToDelete = users.find((user) => user.id === userId);
    if (!userToDelete) {
      return { ok: false, message: "User does not exist." };
    }

    setUsers((prev) => prev.filter((user) => user.id !== userId));
    if (currentUser?.id === userId) {
      setCurrentUser(null);
    }

    return { ok: true };
  };

  const updateProfile = ({ name, email, password }) => {
    if (!currentUser) {
      return { ok: false, message: "User is not logged in." };
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailTaken = users.some(
      (user) => user.email === normalizedEmail && user.id !== currentUser.id,
    );

    if (emailTaken) {
      return { ok: false, message: "Email is already in use." };
    }

    const updatedUser = {
      ...currentUser,
      name: name.trim(),
      email: normalizedEmail,
      password: password.trim() ? password : currentUser.password,
    };

    setUsers((prev) =>
      prev.map((user) => (user.id === updatedUser.id ? updatedUser : user)),
    );
    setCurrentUser(updatedUser);
    return { ok: true };
  };

  const value = useMemo(
    () => ({
      users,
      currentUser,
      isAuthenticated: Boolean(currentUser),
      register,
      login,
      logout,
      deleteUser,
      updateProfile,
    }),
    [users, currentUser],
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
