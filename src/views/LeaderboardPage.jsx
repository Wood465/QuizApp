import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuiz } from "../context/QuizContext";
import { apiRequest } from "../lib/api";

function formatDuration(seconds) {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.round(seconds)) : 0;
  const mins = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function LeaderboardPage() {
  const { quizzes, loading } = useQuiz();
  const [topicFilter, setTopicFilter] = useState("all");
  const [leaderboardsByQuiz, setLeaderboardsByQuiz] = useState({});
  const [leaderboardsLoading, setLeaderboardsLoading] = useState(false);
  const [leaderboardsError, setLeaderboardsError] = useState("");

  const availableTopics = useMemo(
    () => [...new Set(quizzes.map((quiz) => quiz.topic).filter(Boolean))].sort(),
    [quizzes],
  );

  const filteredQuizzes = useMemo(
    () =>
      topicFilter === "all"
        ? quizzes
        : quizzes.filter((quiz) => quiz.topic === topicFilter),
    [quizzes, topicFilter],
  );

  const loadLeaderboards = useCallback(async () => {
    const quizIds = quizzes.map((quiz) => quiz.id).filter(Boolean);
    if (!quizIds.length) {
      setLeaderboardsByQuiz({});
      setLeaderboardsError("");
      return;
    }

    setLeaderboardsLoading(true);
    setLeaderboardsError("");

    try {
      const query = new URLSearchParams({ quizIds: quizIds.join(",") });
      const data = await apiRequest(`/api/results/leaderboards?${query.toString()}`);
      const map = {};

      for (const leaderboard of data.leaderboards || []) {
        if (!leaderboard?.quizId) {
          continue;
        }
        map[leaderboard.quizId] = leaderboard;
      }

      setLeaderboardsByQuiz(map);
    } catch (apiError) {
      setLeaderboardsError(apiError.message || "Nalaganje leaderboarda ni uspelo.");
    } finally {
      setLeaderboardsLoading(false);
    }
  }, [quizzes]);

  useEffect(() => {
    loadLeaderboards().catch(() => {
      setLeaderboardsError("Nalaganje leaderboarda ni uspelo.");
    });
  }, [loadLeaderboards]);

  return (
    <section className="page-stack">
      <article className="card">
        <h1>Leaderboard</h1>
        <p className="muted">
          Za vsak kviz vidiš svoje mesto, število tekmovalcev in top 10 rezultatov.
        </p>

        {loading ? <p className="muted">Nalagam kvize...</p> : null}

        <div className="quiz-filters">
          <label htmlFor="leaderboard-topic-filter">Filter po temi</label>
          <select
            id="leaderboard-topic-filter"
            value={topicFilter}
            onChange={(event) => setTopicFilter(event.target.value)}
          >
            <option value="all">Vse teme</option>
            {availableTopics.map((topic) => (
              <option key={topic} value={topic}>
                {topic}
              </option>
            ))}
          </select>
        </div>

        {leaderboardsError ? <p className="error-text">{leaderboardsError}</p> : null}
      </article>

      <section className="leaderboard-grid">
        {filteredQuizzes.map((quiz) => {
          const leaderboard = leaderboardsByQuiz[quiz.id] || null;

          return (
            <article key={quiz.id} className="card">
              <h2>{quiz.title}</h2>
              <p className="muted">
                Tema: {quiz.topic} | Tezavnost: {quiz.difficulty}
              </p>

              {leaderboardsLoading && !leaderboard ? (
                <p className="muted">Nalagam leaderboard...</p>
              ) : null}

              {leaderboard ? (
                <div className="leaderboard-box">
                  <p className="muted">
                    Tvoje mesto: {leaderboard.userRank ? `${leaderboard.userRank}.` : "-"}
                    {" | "}Reševalo: {leaderboard.totalParticipants}
                  </p>
                  <p className="muted">
                    Pri enakem rezultatu odloča hitrejši čas (če je na voljo).
                  </p>

                  {leaderboard.top10.length > 0 ? (
                    <ol className="leaderboard-top10">
                      {leaderboard.top10.map((entry) => (
                        <li key={`${quiz.id}-${entry.rank}-${entry.name}-${entry.score}`}>
                          <span>
                            #{entry.rank} {entry.name}
                          </span>
                          <strong>
                            {entry.score}/{entry.total} ({entry.percentage}%)
                            {entry.durationSeconds > 0
                              ? ` | čas: ${formatDuration(entry.durationSeconds)}`
                              : ""}
                          </strong>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="muted">Za ta kviz se še ni rezultatov.</p>
                  )}
                </div>
              ) : null}
            </article>
          );
        })}

        {!loading && filteredQuizzes.length === 0 ? (
          <article className="card">
            <p className="muted">Za izbrano temo trenutno ni kvizov.</p>
          </article>
        ) : null}
      </section>
    </section>
  );
}

export default LeaderboardPage;
