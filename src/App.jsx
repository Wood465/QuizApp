import { Navigate, Route, Routes } from "react-router-dom";
import AdminRoute from "./components/AdminRoute";
import AppLayout from "./components/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";
import AdminPage from "./views/AdminPage";
import ContactPage from "./views/ContactPage";
import DashboardPage from "./views/DashboardPage";
import FeaturesPage from "./views/FeaturesPage";
import LandingPage from "./views/LandingPage";
import LeaderboardPage from "./views/LeaderboardPage";
import LoginPage from "./views/LoginPage";
import ProfilePage from "./views/ProfilePage";
import QuizzesPage from "./views/QuizzesPage";
import ResultsPage from "./views/ResultsPage";
import SignupPage from "./views/SignupPage";
import WhyPage from "./views/WhyPage";

function PublicOnlyRoute({ children }) {
  const { isAuthenticated, authReady } = useAuth();

  if (!authReady) {
    return <main className="simple-page">Nalagam prijavo...</main>;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/funkcije" element={<FeaturesPage />} />
      <Route path="/zakaj" element={<WhyPage />} />
      <Route path="/kontakt" element={<ContactPage />} />

      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <LoginPage />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/signup"
        element={
          <PublicOnlyRoute>
            <SignupPage />
          </PublicOnlyRoute>
        }
      />

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/quizzes" element={<QuizzesPage />} />
        <Route path="/results" element={<ResultsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminPage />
            </AdminRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;


