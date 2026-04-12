const KEYS = {
  users: "smartQuizUsers",
  currentUser: "smartQuizCurrentUser",
  quizzes: "smartQuizQuizzes",
  results: "smartQuizResults",
};

export function loadFromStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore persistence failures (private mode, quota exceeded, etc.).
  }
}

export { KEYS };
