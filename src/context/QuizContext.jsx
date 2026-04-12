import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { defaultQuizzes } from "../data/defaultQuizzes";
import { createId } from "../utils/id";
import { KEYS, loadFromStorage, saveToStorage } from "../utils/storage";

const QuizContext = createContext(null);

export function QuizProvider({ children }) {
  const [quizzes, setQuizzes] = useState(() =>
    loadFromStorage(KEYS.quizzes, defaultQuizzes),
  );
  const [results, setResults] = useState(() => loadFromStorage(KEYS.results, []));

  useEffect(() => {
    saveToStorage(KEYS.quizzes, quizzes);
  }, [quizzes]);

  useEffect(() => {
    saveToStorage(KEYS.results, results);
  }, [results]);

  const addQuiz = ({ title, topic, difficulty, questions }) => {
    const quiz = {
      id: createId(),
      title: title.trim(),
      topic: topic.trim(),
      difficulty,
      questions,
    };
    setQuizzes((prev) => [...prev, quiz]);
    return quiz;
  };

  const updateQuiz = (quizId, payload) => {
    setQuizzes((prev) =>
      prev.map((quiz) =>
        quiz.id === quizId
          ? {
              ...quiz,
              ...payload,
            }
          : quiz,
      ),
    );
  };

  const deleteQuiz = (quizId) => {
    setQuizzes((prev) => prev.filter((quiz) => quiz.id !== quizId));
    setResults((prev) => prev.filter((result) => result.quizId !== quizId));
  };

  const submitQuiz = ({ userId, quizId, answers }) => {
    const quiz = quizzes.find((item) => item.id === quizId);
    if (!quiz) {
      return { ok: false, message: "Quiz does not exist." };
    }

    let score = 0;
    quiz.questions.forEach((question, index) => {
      if (answers[index] === question.answerIndex) {
        score += 1;
      }
    });

    const entry = {
      id: createId(),
      userId,
      quizId,
      quizTitle: quiz.title,
      score,
      total: quiz.questions.length,
      percentage: Math.round((score / quiz.questions.length) * 100),
      createdAt: new Date().toISOString(),
    };

    setResults((prev) => [entry, ...prev]);
    return { ok: true, entry };
  };

  const value = useMemo(
    () => ({
      quizzes,
      results,
      addQuiz,
      updateQuiz,
      deleteQuiz,
      submitQuiz,
    }),
    [quizzes, results],
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
