import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";
import { apiRequest } from "../lib/api";

const QuizContext = createContext(null);

export function QuizProvider({ children }) {
  const { currentUser, authReady } = useAuth();
  const [quizzes, setQuizzes] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadQuizzes = async () => {
    const data = await apiRequest("/api/quizzes");
    setQuizzes(data.quizzes || []);
  };

  const loadResults = async () => {
    if (!currentUser) {
      setResults([]);
      return;
    }

    const data = await apiRequest("/api/results");
    setResults(data.results || []);
  };

  const refresh = async () => {
    setLoading(true);
    try {
      await loadQuizzes();
      await loadResults();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authReady) {
      return;
    }
    refresh();
  }, [authReady, currentUser?.id]);

  const addQuiz = async ({ title, topic, difficulty, questions }) => {
    const data = await apiRequest("/api/quizzes", {
      method: "POST",
      body: JSON.stringify({ title, topic, difficulty, questions }),
    });
    if (data.quiz) {
      setQuizzes((prev) => [...prev, data.quiz]);
    }
    return data.quiz;
  };

  const updateQuiz = async (quizId, payload) => {
    const data = await apiRequest(`/api/quizzes/${quizId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    if (data.quiz) {
      setQuizzes((prev) => prev.map((quiz) => (quiz.id === quizId ? data.quiz : quiz)));
    }
  };

  const deleteQuiz = async (quizId) => {
    await apiRequest(`/api/quizzes/${quizId}`, { method: "DELETE" });
    setQuizzes((prev) => prev.filter((quiz) => quiz.id !== quizId));
    setResults((prev) => prev.filter((result) => result.quizId !== quizId));
  };

  const submitQuiz = async ({ quizId, answers }) => {
    try {
      const data = await apiRequest("/api/results/submit", {
        method: "POST",
        body: JSON.stringify({ quizId, answers }),
      });

      const entry = data.entry;
      if (entry) {
        setResults((prev) => [entry, ...prev]);
      }

      return { ok: true, entry };
    } catch (error) {
      return { ok: false, message: error.message };
    }
  };

  const value = useMemo(
    () => ({
      quizzes,
      results,
      loading,
      addQuiz,
      updateQuiz,
      deleteQuiz,
      submitQuiz,
      refresh,
    }),
    [quizzes, results, loading],
  );

  return <QuizContext.Provider value={value}>{children}</QuizContext.Provider>;
}

export function useQuiz() {
  const context = useContext(QuizContext);
  if (!context) {
    throw new Error("useQuiz must be used inside QuizProvider.");
  }
  return context;
}
