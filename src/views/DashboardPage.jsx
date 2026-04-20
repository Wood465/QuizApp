import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useQuiz } from "../context/QuizContext";

function formatDuration(seconds) {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.round(seconds)) : 0;
  const mins = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function formatDelta(points) {
  if (points > 0) {
    return `+${points}`;
  }
  if (points < 0) {
    return `${points}`;
  }
  return "0";
}

function ProgressChart({ attempts }) {
  if (!attempts.length) {
    return null;
  }

  const width = 760;
  const height = 260;
  const paddingX = 44;
  const paddingY = 24;
  const innerWidth = width - paddingX * 2;
  const innerHeight = height - paddingY * 2;

  const points = attempts.map((attempt, index) => {
    const x =
      attempts.length === 1
        ? paddingX + innerWidth / 2
        : paddingX + (index / (attempts.length - 1)) * innerWidth;
    const bounded = Math.max(0, Math.min(100, Number(attempt.percentage) || 0));
    const y = paddingY + ((100 - bounded) / 100) * innerHeight;

    return {
      x,
      y,
      attempt,
      label: `Poskus ${index + 1}`,
    };
  });

  const polylinePoints = points.map((point) => `${point.x},${point.y}`).join(" ");
  const gridLevels = [0, 25, 50, 75, 100];

  return (
    <svg
      className="progress-chart"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Graf napredka po poskusih"
    >
      {gridLevels.map((level) => {
        const y = paddingY + ((100 - level) / 100) * innerHeight;
        return (
          <g key={level}>
            <line
              x1={paddingX}
              y1={y}
              x2={paddingX + innerWidth}
              y2={y}
              stroke="#d8e0ea"
              strokeWidth="1"
            />
            <text x={8} y={y + 4} fontSize="11" fill="#5b6778">
              {level}%
            </text>
          </g>
        );
      })}

      <polyline
        fill="none"
        stroke="#0a7a5a"
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={polylinePoints}
      />

      {points.map((point, index) => (
        <g key={point.label}>
          <circle cx={point.x} cy={point.y} r="4.5" fill="#0a7a5a">
            <title>
              Poskus {index + 1}: {point.attempt.percentage}%
            </title>
          </circle>
          {attempts.length <= 10 || index === 0 || index === attempts.length - 1 ? (
            <text x={point.x - 16} y={height - 8} fontSize="11" fill="#5b6778">
              P{index + 1}
            </text>
          ) : null}
        </g>
      ))}
    </svg>
  );
}

function DashboardPage() {
  const { currentUser } = useAuth();
  const { quizzes, results, loading } = useQuiz();
  const [selectedProgressQuizId, setSelectedProgressQuizId] = useState("");

  const myResults = results.filter((item) => item.userId === currentUser.id);
  const solved = myResults.length;
  const best = myResults.length
    ? Math.max(...myResults.map((item) => item.percentage))
    : 0;
  const average =
    myResults.length > 0
      ? Math.round(
          myResults.reduce((acc, item) => acc + item.percentage, 0) /
            myResults.length,
        )
      : 0;

  const timedResults = myResults.filter((item) => Number(item.durationSeconds) > 0);
  const averageDuration = timedResults.length
    ? Math.round(
        timedResults.reduce((acc, item) => acc + Number(item.durationSeconds || 0), 0) /
          timedResults.length,
      )
    : 0;
  const bestDuration = timedResults.length
    ? Math.min(...timedResults.map((item) => Number(item.durationSeconds || 0)))
    : 0;

  const attemptsByQuiz = useMemo(() => {
    const groups = new Map();

    for (const result of myResults) {
      if (!groups.has(result.quizId)) {
        groups.set(result.quizId, {
          quizId: result.quizId,
          quizTitle: result.quizTitle,
          attempts: [],
        });
      }

      groups.get(result.quizId).attempts.push(result);
    }

    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        attempts: [...group.attempts].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        ),
      }))
      .sort((a, b) => a.quizTitle.localeCompare(b.quizTitle));
  }, [myResults]);

  useEffect(() => {
    if (!attemptsByQuiz.length) {
      setSelectedProgressQuizId("");
      return;
    }

    if (attemptsByQuiz.some((item) => item.quizId === selectedProgressQuizId)) {
      return;
    }

    const withMultipleAttempts = attemptsByQuiz.find((item) => item.attempts.length > 1);
    setSelectedProgressQuizId((withMultipleAttempts || attemptsByQuiz[0]).quizId);
  }, [attemptsByQuiz, selectedProgressQuizId]);

  const selectedProgressQuiz =
    attemptsByQuiz.find((item) => item.quizId === selectedProgressQuizId) || null;
  const progressAttempts = selectedProgressQuiz?.attempts || [];
  const firstAttempt = progressAttempts[0] || null;
  const lastAttempt = progressAttempts[progressAttempts.length - 1] || null;
  const progressDelta =
    progressAttempts.length >= 2
      ? Number(lastAttempt.percentage) - Number(firstAttempt.percentage)
      : 0;

  return (
    <section className="page-stack">
      <div className="page-grid">
        <article className="card">
          <h1>Dobrodosel, {currentUser.name}</h1>
          <p className="muted">
            Nadaljuj z ucenjem. Na voljo imas {quizzes.length} kvizov razlicnih tem
            in tezavnosti.
          </p>
          <div className="hero-actions">
            <Link className="btn primary" to="/quizzes">
              Resuj kvize
            </Link>
            <Link className="btn secondary" to="/leaderboard">
              Leaderboard
            </Link>
            <Link className="btn secondary" to="/results">
              Poglej rezultate
            </Link>
          </div>
          {loading ? <p className="muted">Nalagam podatke...</p> : null}
        </article>

        <article className="card">
          <h2>Tvoja statistika</h2>
          <div className="stats">
            <div className="stat">
              <strong>{solved}</strong>
              <span>resenih kvizov</span>
            </div>
            <div className="stat">
              <strong>{best}%</strong>
              <span>najboljsi rezultat</span>
            </div>
            <div className="stat">
              <strong>{average}%</strong>
              <span>povprecje</span>
            </div>
            <div className="stat">
              <strong>{quizzes.length}</strong>
              <span>skupno kvizov</span>
            </div>
            <div className="stat">
              <strong>{timedResults.length ? formatDuration(averageDuration) : "-"}</strong>
              <span>povprecen cas</span>
            </div>
            <div className="stat">
              <strong>{timedResults.length ? formatDuration(bestDuration) : "-"}</strong>
              <span>najhitrejsi cas</span>
            </div>
          </div>
          {!timedResults.length && myResults.length > 0 ? (
            <p className="muted">Cas se belezi za nove poskuse. Starejsi rezultati ga nimajo.</p>
          ) : null}
        </article>
      </div>

      <article className="card">
        <h2>Napredek po poskusih</h2>
        <p className="muted">
          Izberi kviz in poglej, kako se je rezultat izboljsal od prvega do zadnjega
          poskusa.
        </p>

        {!attemptsByQuiz.length ? (
          <p className="muted">Zaenkrat se nimas rezultatov za prikaz grafa.</p>
        ) : (
          <>
            <div className="progress-controls">
              <label htmlFor="progress-quiz">Kviz</label>
              <select
                id="progress-quiz"
                value={selectedProgressQuizId}
                onChange={(event) => setSelectedProgressQuizId(event.target.value)}
              >
                {attemptsByQuiz.map((group) => (
                  <option key={group.quizId} value={group.quizId}>
                    {group.quizTitle} ({group.attempts.length})
                  </option>
                ))}
              </select>
            </div>

            {progressAttempts.length ? (
              <>
                <div className="progress-inline-metrics">
                  <span>
                    Poskusi: <strong>{progressAttempts.length}</strong>
                  </span>
                  <span>
                    Prvi rezultat: <strong>{firstAttempt?.percentage || 0}%</strong>
                  </span>
                  <span>
                    Zadnji rezultat: <strong>{lastAttempt?.percentage || 0}%</strong>
                  </span>
                  <span
                    className={`progress-delta ${progressDelta >= 0 ? "progress-up" : "progress-down"}`}
                  >
                    Napredek: {formatDelta(progressDelta)} tock
                  </span>
                </div>

                <div className="progress-chart-wrap">
                  <ProgressChart attempts={progressAttempts} />
                </div>

                <p className="muted">
                  Zadnji poskus: {lastAttempt ? new Date(lastAttempt.createdAt).toLocaleString("sl-SI") : "-"}
                  {lastAttempt && Number(lastAttempt.durationSeconds) > 0
                    ? ` | cas: ${formatDuration(lastAttempt.durationSeconds)}`
                    : ""}
                </p>
              </>
            ) : null}
          </>
        )}
      </article>
    </section>
  );
}

export default DashboardPage;
